/**
 * Хелпер для інтеграційних тестів.
 * Будує Fastify застосунок через buildApp() БЕЗ виклику fastify.listen(),
 * тому сервер не запускається на мережевому порту під час тестів.
 *
 * Використовує .env.test (NODE_ENV=test) для окремої тестової БД та Redis.
 */
import { buildApp } from '../../app.js';
import { users, devices } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export async function createTestApp() {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export async function clearDatabase(app) {
  await app.db.delete(devices);
  await app.db.delete(users);
}

export async function clearRedis(app) {
  await app.redis.flushdb();
}

export async function registerAndLogin(app, credentials = {}) {
  const email = credentials.email ?? 'test@example.com';
  const password = credentials.password ?? 'password123';

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, password },
  });

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  const setCookie = loginRes.headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr ? cookieStr.split(';')[0] : null;
}

export async function createTestDevice(app, overrides = {}) {
  const data = {
    device: 'Test Light',
    room: 'Living Room',
    status: 'off',
    description: 'Test device',
    ...overrides,
  };
  const [result] = await app.db.insert(devices).values(data);
  const [created] = await app.db
    .select()
    .from(devices)
    .where(eq(devices.id, result.insertId));
  return created;
}
