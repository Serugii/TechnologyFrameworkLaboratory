import { AuthService } from '../services/auth.service.js';
import { REDIS_TTL } from '#constants/redis';
import {
  registerBodySchema,
  loginBodySchema,
  registerResponseSchema,
  loginResponseSchema,
  refreshResponseSchema,
  bearerSecurity,
  authorizationHeaderSchema,
} from '../schemas/auth.schema.js';

export default async function authRoutes(fastify) {
  const authService = new AuthService(fastify.db, fastify.redis);

  // ---------------- REGISTER ----------------
  fastify.post(
    '/register',
    {
      schema: {
        summary: 'Реєстрація користувача',
        description: 'Створює нового користувача. Повертає 409 якщо email вже зайнятий.',
        tags: ['Auth'],
        body: registerBodySchema,
        response: {
          201: registerResponseSchema,
          409: {
            description: 'Email вже використовується',
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const user = await authService.register(email, password);
      return reply.code(201).send(user);
    },
  );

  // ---------------- LOGIN ----------------
  fastify.post(
    '/login',
    {
      schema: {
        summary: 'Вхід користувача',
        description: 'Повертає access token у body та refresh token у httpOnly cookie.',
        tags: ['Auth'],
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
          401: {
            description: 'Невірні облікові дані',
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const user = await authService.login(email, password);

      const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email },
        { jwtid: crypto.randomUUID() },
      );

      const refreshToken = fastify.jwt.sign(
        { sub: user.id },
        { expiresIn: '7d', jwtid: crypto.randomUUID() },
      );

      await authService.saveRefreshToken(user.id, refreshToken);

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        // eslint-disable-next-line no-restricted-properties
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh',
        maxAge: REDIS_TTL.REFRESH_TOKEN,
      });

      return reply.send({ accessToken });
    },
  );

  // ---------------- REFRESH ----------------
  fastify.post(
    '/refresh',
    {
      schema: {
        summary: 'Оновлення access token',
        description: 'Перевіряє refresh token з httpOnly cookie та повертає новий access token.',
        tags: ['Auth'],
        response: {
          200: refreshResponseSchema,
          401: {
            description: 'Refresh token відсутній або відкликаний',
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const token = request.cookies?.refreshToken ?? request.body?.refreshToken;

      if (!token) {
        return reply.unauthorized('Refresh token missing');
      }

      let payload;
      try {
        payload = fastify.jwt.verify(token);
      } catch (err) {
        return reply.unauthorized('Invalid refresh token');
      }

      const stored = await authService.getRefreshToken(payload.sub);
      fastify.log.info({ stored, token, match: stored === token }, 'refresh debug');
      if (!stored || stored !== token) {
        return reply.unauthorized('Refresh token revoked');
      }

      const accessToken = fastify.jwt.sign(
        { sub: payload.sub },
        { jwtid: crypto.randomUUID() },
      );

      return reply.send({ accessToken });
    },
  );

  // ---------------- LOGOUT ----------------
  fastify.post(
    '/logout',
    {
      schema: {
        summary: 'Вихід користувача',
        description: 'Додає access token до blacklist, видаляє refresh token з Redis.',
        tags: ['Auth'],
        security: bearerSecurity,
        headers: authorizationHeaderSchema,
        response: {
          204: { type: 'null', description: 'Успішний вихід' },
          401: {
            description: 'Токен відсутній або недійсний',
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      await request.jwtVerify();

      const { jti, exp } = request.user;
      const now = Math.floor(Date.now() / 1000);
      const ttl = exp - now;

      if (jti && ttl > 0) {
        await authService.blacklistToken(jti, ttl);
      }

      await authService.deleteRefreshToken(request.user.sub);

      reply.clearCookie('refreshToken', { path: '/auth/refresh' });
      return reply.code(204).send();
    },
  );
}
