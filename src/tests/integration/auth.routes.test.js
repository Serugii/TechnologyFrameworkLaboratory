/**
 * Integration тести для Auth ендпоінтів:
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/logout
 *   GET  /api/v1/auth/me
 *
 * Сервер НЕ запускається на мережевому порту — використовується fastify.inject().
 * Тести використовують окрему БД (smart_home_devices_test) та Redis (port 6380).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, clearDatabase, clearRedis } from './helpers.js';

describe('Auth Routes — Integration', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(app);
    await clearRedis(app);
  });

  // ================================================================
  // POST /api/v1/auth/register
  // ================================================================
  describe('POST /api/v1/auth/register', () => {
    it('PASS реєструє нового користувача і повертає 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(201);

      const body = res.json();
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email', 'user@example.com');
      expect(body.user).not.toHaveProperty('password');
    });

    it('PASS встановлює session cookie після реєстрації', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(201);
      const cookie = res.headers['set-cookie'];
      expect(cookie).toBeDefined();
    });

    it('FAIL повертає 409 якщо email вже зайнятий', async () => {
      const payload = { email: 'dupe@example.com', password: 'password123' };

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body).toHaveProperty('error');
    });

    it('FAIL повертає 400 при відсутньому email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('FAIL повертає 400 при відсутньому password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@example.com' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('FAIL повертає 400 при невалідному форматі email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('FAIL повертає 400 якщо пароль коротший 6 символів', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@example.com', password: '123' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================================
  // POST /api/v1/auth/login
  // ================================================================
  describe('POST /api/v1/auth/login', () => {
    const credentials = { email: 'login@example.com', password: 'password123' };

    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: credentials,
      });
    });

    it('PASS повертає 200 та дані юзера при правильних даних', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: credentials,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('message');
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email', credentials.email);
      expect(body.user).not.toHaveProperty('password');
    });

    it('PASS встановлює session cookie після логіну', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: credentials,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('FAIL повертає 401 при невірному паролі', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: credentials.email, password: 'wrongpassword' },
      });
      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body).toHaveProperty('error');
    });

    it('FAIL повертає 401 при неіснуючому email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nobody@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('FAIL повертає 400 при відсутньому body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================================
  // POST /api/v1/auth/logout
  // ================================================================
  describe('POST /api/v1/auth/logout', () => {
    it('PASS повертає 204 та знищує сесію', async () => {
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'logout@example.com', password: 'password123' },
      });
      const cookie = regRes.headers['set-cookie'];

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie },
      });

      expect(res.statusCode).toBe(204);
    });

    it('PASS після logout /auth/me повертає 401', async () => {
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'logout2@example.com', password: 'password123' },
      });
      const cookie = regRes.headers['set-cookie'];

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie },
      });

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie },
      });

      expect(meRes.statusCode).toBe(401);
    });

    it('PASS logout без сесії повертає 204 (ідемпотентно)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });
      expect(res.statusCode).toBe(204);
    });
  });

  // ================================================================
  // GET /api/v1/auth/me
  // ================================================================
  describe('GET /api/v1/auth/me', () => {
    it('PASS повертає поточного юзера при активній сесії', async () => {
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'me@example.com', password: 'password123' },
      });
      const cookie = regRes.headers['set-cookie'];

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email', 'me@example.com');
      expect(body.user).not.toHaveProperty('password');
    });

    it('FAIL повертає 401 без сесії', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });

    it('FAIL повертає 401 з невалідним cookie', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: 'sessionId=invalid_session_id' },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
