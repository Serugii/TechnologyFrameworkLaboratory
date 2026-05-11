import { AuthService } from '../services/auth.service.js';
import { REDIS_TTL } from '#constants/redis';

export class AuthController {
  constructor(db, redis) {
    this.authService = new AuthService(db, redis);
  }

  async register(request, reply) {
    const { email, password } = request.body;
    const user = await this.authService.register(email, password);
    return reply.status(201).send(user);
  }

  async login(request, reply) {
    const { email, password } = request.body;
    const user = await this.authService.login(email, password);

    const accessToken = request.server.jwt.sign(
      { sub: user.id, email: user.email },
      { jwtid: crypto.randomUUID(), expiresIn: '15m' },
    );

    const refreshToken = request.server.jwt.sign(
      { sub: user.id },
      { jwtid: crypto.randomUUID(), expiresIn: '7d' },
    );

    await this.authService.saveRefreshToken(user.id, refreshToken);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      // eslint-disable-next-line no-restricted-properties
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: REDIS_TTL.REFRESH_TOKEN,
    });

    return reply.send({ accessToken });
  }

  async refresh(request, reply) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      return reply.status(401).send({ error: 'Refresh token missing' });
    }

    let payload;
    try {
      payload = request.server.jwt.verify(refreshToken);
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    const stored = await this.authService.getRefreshToken(payload.sub);
    if (!stored || stored !== refreshToken) {
      return reply.status(401).send({ error: 'Refresh token revoked' });
    }

    const accessToken = request.server.jwt.sign(
      { sub: payload.sub },
      { jwtid: crypto.randomUUID(), expiresIn: '15m' },
    );

    return reply.send({ accessToken });
  }

  async logout(request, reply) {
    await request.jwtVerify();

    const token = request.user;
    const now = Math.floor(Date.now() / 1000);
    const ttl = token.exp - now;

    if (ttl > 0) {
      await this.authService.blacklistToken(token.jti, ttl);
    }

    await this.authService.deleteRefreshToken(token.sub);

    reply.clearCookie('refreshToken', { path: '/auth' });

    return reply.status(204).send();
  }
}
