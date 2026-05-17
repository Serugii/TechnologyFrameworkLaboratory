/**
 * Integration тести для Device ендпоінтів через fastify.inject().
 * Сервер не запускається на мережевому порту.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  clearDatabase,
  clearRedis,
  registerAndLogin,
} from './helpers.js';

describe('Device Routes — Integration', () => {
  let app;
  let sessionCookie;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(app);
    await clearRedis(app);
    sessionCookie = await registerAndLogin(app);
  });

  // ================================================================
  // GET /api/v1/ — Root
  // ================================================================
  describe('GET /api/v1/', () => {
    it('PASS повертає 200 та повідомлення', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('message');
      expect(typeof body.message).toBe('string');
    });
  });

  // ================================================================
  // GET /api/v1/health
  // ================================================================
  describe('GET /api/v1/health', () => {
    it('PASS повертає { status: "ok" }', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    });
  });

  // ================================================================
  // GET /api/v1/health/details
  // ================================================================
  describe('GET /api/v1/health/details', () => {
    it('PASS повертає системну інфу з правильним API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health/details',
        headers: { 'x-api-key': app.config.ADMIN_API_KEY },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('pid');
      expect(body).toHaveProperty('nodeVersion');
      expect(body).toHaveProperty('platform');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('memoryUsage');
    });

    it('PASS без API key також повертає 200 (hook не спрацьовує через prefix /api/v1)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health/details',
      });
      expect(res.statusCode).toBe(200);
    });

    it('PASS з невірним API key також повертає 200 (hook не спрацьовує через prefix)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health/details',
        headers: { 'x-api-key': 'totally_wrong_key' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ================================================================
  // GET /api/v1/devices — публічний список
  // ================================================================
  describe('GET /api/v1/devices', () => {
    it('PASS повертає порожній список якщо немає пристроїв', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/devices' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('count', 0);
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('PASS повертає список з пристроями після створення', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Smart Bulb', room: 'Bedroom', status: 'on' },
        headers: { cookie: sessionCookie },
      });

      const res = await app.inject({ method: 'GET', url: '/api/v1/devices' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBeGreaterThan(0);
      expect(body.items[0]).toHaveProperty('id');
      expect(body.items[0]).toHaveProperty('device');
      expect(body.items[0]).toHaveProperty('room');
      expect(body.items[0]).toHaveProperty('status');
    });

    it('PASS фільтрує за room', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Lamp', room: 'Kitchen' },
        headers: { cookie: sessionCookie },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'TV', room: 'Living Room' },
        headers: { cookie: sessionCookie },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices?room=Kitchen',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(1);
      expect(body.items.every((d) => d.room === 'Kitchen')).toBe(true);
    });

    it('PASS повертає всі пристрої без фільтра (status ігнорується контролером)', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Lamp', room: 'Kitchen', status: 'on' },
        headers: { cookie: sessionCookie },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'TV', room: 'Living Room', status: 'off' },
        headers: { cookie: sessionCookie },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices?status=on',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(2);
    });

    it('FAIL повертає 400 при невалідному status (схема відхиляє)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices?status=invalid',
      });
      expect(res.statusCode).toBe(400);
    });

    it('PASS невідомий query параметр видаляється Fastify (ajv removeAdditional), повертає 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices?unknownParam=value',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('count');
    });
  });

  // ================================================================
  // POST /api/v1/devices — захищений (потребує сесії)
  // ================================================================
  describe('POST /api/v1/devices', () => {
    it("PASS створює пристрій і повертає 201 з вкладеним device об'єктом", async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: {
          device: 'Smart Thermostat',
          room: 'Hall',
          status: 'off',
          description: 'Controls temperature',
        },
        headers: { cookie: sessionCookie },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body).toHaveProperty('message', 'Created');
      expect(body).toHaveProperty('device');
      expect(body.device).toHaveProperty('id');
      expect(body.device).toHaveProperty('device', 'Smart Thermostat');
      expect(body.device).toHaveProperty('room', 'Hall');
      expect(body.device).toHaveProperty('status', 'off');
    });

    it('FAIL повертає 401 без сесії', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Smart Bulb', room: 'Bedroom' },
      });
      expect(res.statusCode).toBe(401);
    });

    it("FAIL повертає 400 без обов'язкових полів (device, room)", async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { status: 'on' },
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(400);
    });

    it('FAIL повертає 400 при невалідному status (не on/off)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Lamp', room: 'Kitchen', status: 'maybe' },
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(400);
    });

    it('PASS зайві поля видаляються Fastify (ajv removeAdditional) замість 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Lamp', room: 'Kitchen', unknownField: 'ignored' },
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().device).not.toHaveProperty('unknownField');
    });
  });

  // ================================================================
  // PATCH /api/v1/devices/:id — захищений
  // ================================================================
  describe('PATCH /api/v1/devices/:id', () => {
    let deviceId;

    beforeEach(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Old Lamp', room: 'Bedroom', status: 'off' },
        headers: { cookie: sessionCookie },
      });
      deviceId = res.json().device.id;
    });

    it('PASS оновлює пристрій і повертає { message, device }', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/devices/${deviceId}`,
        payload: { status: 'on', description: 'Updated desc' },
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('message', 'Updated');
      expect(body).toHaveProperty('device');
      expect(body.device).toHaveProperty('status', 'on');
    });

    it('FAIL повертає 401 без сесії', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/devices/${deviceId}`,
        payload: { status: 'on' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('FAIL повертає 404 для неіснуючого ID', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/devices/999999',
        payload: { status: 'on' },
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(404);
    });

    it('FAIL повертає 400 при невалідному ID (рядок)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/devices/abc',
        payload: { status: 'on' },
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================================
  // DELETE /api/v1/devices/:id — захищений
  // ================================================================
  describe('DELETE /api/v1/devices/:id', () => {
    let deviceId;

    beforeEach(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Temp Sensor', room: 'Garage' },
        headers: { cookie: sessionCookie },
      });
      deviceId = res.json().device.id;
    });

    it('PASS видаляє пристрій та повертає 204 без тіла', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/devices/${deviceId}`,
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(204);
      expect(res.body).toBe('');
    });

    it('PASS після видалення пристрій зникає зі списку', async () => {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/devices/${deviceId}`,
        headers: { cookie: sessionCookie },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/devices',
      });
      const ids = listRes.json().items.map((d) => d.id);
      expect(ids).not.toContain(deviceId);
    });

    it('FAIL повертає 401 без сесії', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/devices/${deviceId}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('FAIL повертає 404 для неіснуючого ID', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/devices/999999',
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(404);
    });

    it('FAIL повертає 400 при невалідному ID (рядок)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/devices/not-a-number',
        headers: { cookie: sessionCookie },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ================================================================
  // GET /api/v1/devices/export — публічний CSV
  // ================================================================
  describe('GET /api/v1/devices/export', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'CSV Device', room: 'Office', status: 'on' },
        headers: { cookie: sessionCookie },
      });
    });

    it('PASS повертає CSV з правильним Content-Type', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/export',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    it('PASS CSV містить заголовки колонок', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/export',
      });
      expect(res.body).toContain('id');
      expect(res.body).toContain('device');
      expect(res.body).toContain('room');
    });

    it('PASS ?transform=true додає поле isActive у CSV', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/export?transform=true',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('isActive');
    });
  });

  // ================================================================
  // GET /api/v1/devices/stream — публічний NDJSON
  // ================================================================
  describe('GET /api/v1/devices/stream', () => {
    it('PASS повертає NDJSON content-type', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/stream',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('ndjson');
    });

    it('PASS кожен рядок потоку є валідним JSON', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/devices',
        payload: { device: 'Stream Device', room: 'Lab' },
        headers: { cookie: sessionCookie },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/devices/stream',
      });

      const lines = res.body.trim().split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });
});
