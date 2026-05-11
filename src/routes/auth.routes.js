import { createAuthRepository } from '../repositories/auth.repository.js';
import { createAuthService } from '../services/auth.service.js';
import {
  registerBodySchema,
  loginBodySchema,
  authResponseSchema,
  meResponseSchema,
} from '../schemas/auth.schema.js';

export default async function authRoutes(fastify) {
  const authRepository = createAuthRepository(fastify.db);
  const authService = createAuthService(authRepository);

  // POST /api/v1/auth/register
  fastify.post(
    '/auth/register',
    {
      schema: {
        summary: 'Реєстрація користувача',
        description:
          'Створює новий обліковий запис. Хешує пароль через argon2, зберігає у БД та відкриває сесію.',
        tags: ['Auth'],
        body: registerBodySchema,
        response: {
          201: authResponseSchema,
          409: {
            description: 'Email вже використовується',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await authService.register(request.body);
      request.session.userId = user.id;
      return reply.status(201).send({ message: 'Реєстрацію успішно завершено', user });
    },
  );

  // POST /api/v1/auth/login
  fastify.post(
    '/auth/login',
    {
      schema: {
        summary: 'Вхід користувача',
        description:
          'Верифікує облікові дані через argon2.verify(), створює сесію та зберігає її у Redis.',
        tags: ['Auth'],
        body: loginBodySchema,
        response: {
          200: authResponseSchema,
          401: {
            description: 'Невірний email або пароль',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await authService.login(request.body);
      request.session.userId = user.id;
      return reply.send({ message: 'Вхід успішний', user });
    },
  );

  // POST /api/v1/auth/logout
  fastify.post(
    '/auth/logout',
    {
      schema: {
        summary: 'Вихід користувача',
        description: 'Знищує поточну сесію у Redis. Повертає 204 No Content.',
        tags: ['Auth'],
        response: {
          204: {
            description: 'Сесію успішно знищено',
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      await request.session.destroy();
      return reply.status(204).send();
    },
  );

  // GET /api/v1/auth/me
  fastify.get(
    '/auth/me',
    {
      schema: {
        summary: 'Поточний користувач',
        description:
          'Повертає дані авторизованого користувача на основі активної сесії. Поле password не включається у відповідь.',
        tags: ['Auth'],
        response: {
          200: meResponseSchema,
          401: {
            description: 'Сесія відсутня або недійсна',
            type: 'object',
            properties: { message: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.session.userId;
      if (!userId) {
        return reply.status(401).send({ message: 'Не авторизовано' });
      }
      const user = await authService.getMe(userId);
      return reply.send({ user });
    },
  );
}
