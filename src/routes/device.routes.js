import * as controller from '#controllers';
import { ERRORS } from '#constants';
import {
  deviceBodySchema,
  deviceUpdateSchema,
  deviceResponseSchema,
  deviceParamsSchema,
  deviceCreateResponseSchema,
  deviceQuerySchema,
  devicePatchResponseSchema,
  deviceDeleteResponseSchema,
  paginationQuerySchema,
} from '#schemas';

const parseId = (id, reply) => {
  const num = Number(id);
  if (Number.isNaN(num)) {
    reply.badRequest(ERRORS.INVALID_ID);
    return null;
  }
  return num;
};

export default async function deviceRoutes(fastify) {
  // ---------------- ROOT ----------------
  fastify.get('/', async () => ({ message: 'Smart Home API працює' }));

  // ---------------- HEALTH ----------------
  fastify.get('/health', async () => ({ status: 'ok' }));

  // ---------------- AUTH HOOK ----------------
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/health/details')) {
      const apiKey = request.headers['x-api-key'];
      if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
        return reply.unauthorized(ERRORS.UNAUTHORIZED);
      }
    }
  });

  // ---------------- HEALTH DETAILS ----------------
  fastify.get('/health/details', async () => ({
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  }));

  // ---------------- GET DEVICES ----------------
  fastify.get(
    '/devices',
    {
      schema: {
        summary: 'Отримати список пристроїв',
        description: 'Перегляд пристроїв',
        tags: ['Devices'],
        querystring: deviceQuerySchema,
        response: {
          200: {
            type: 'object',
            required: ['count', 'items'],
            properties: {
              count: { type: 'number' },
              items: { type: 'array', items: deviceResponseSchema },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await controller.getDevices(request.query);
      return reply.code(200).send(result);
    },
  );

  // ---------------- POST DEVICE ----------------
  fastify.post(
    '/devices',
    {
      schema: {
        summary: 'Створення нового пристрою',
        description: 'Додавання нового пристрою до системи',
        tags: ['Devices'],
        body: deviceBodySchema,
        response: { 201: deviceCreateResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await controller.postDevice(null, reply, request.body);
      reply.code(201);
      return result;
    },
  );

  // ---------------- UPLOAD IMAGE ----------------
  fastify.post(
    '/devices/:id/image',
    {
      schema: {
        summary: 'Завантаження зображення для пристрою',
        description: 'Дозволяє завантажити зображення для конкретного пристрою',
        tags: ['Devices'],
        params: deviceParamsSchema,
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              image: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = parseId(request.params.id, reply);
      if (!id) return;

      const data = await request.file();
      if (!data) throw { statusCode: 400, message: 'File is required' };

      if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
        throw { statusCode: 400, message: 'Only JPEG and PNG allowed' };
      }

      if (data.file.truncated) {
        throw { statusCode: 400, message: 'File too large (max 5MB)' };
      }

      const fileBuffer = await data.toBuffer();
      return controller.uploadDeviceImage(request, reply, id, data, fileBuffer);
    },
  );

  // ---------------- PATCH DEVICE ----------------
  fastify.patch(
    '/devices/:id',
    {
      schema: {
        summary: 'Оновлення пристрою',
        description: 'Оновлення інформації про конкретний пристрій',
        tags: ['Devices'],
        params: deviceParamsSchema,
        body: deviceUpdateSchema,
        response: { 200: devicePatchResponseSchema },
      },
    },
    async (request, reply) => {
      const id = parseId(request.params.id, reply);
      if (!id) return;

      const result = await controller.patchDevice(
        null,
        reply,
        id,
        request.body,
      );
      if (!result) return reply.notFound(ERRORS.DEVICE_NOT_FOUND);
      return result;
    },
  );

  // ---------------- DELETE DEVICE ----------------
  fastify.delete(
    '/devices/:id',
    {
      schema: {
        summary: 'Видалення пристрою',
        description: 'Видалення конкретного пристрою з системи',
        tags: ['Devices'],
        params: deviceParamsSchema,
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const id = parseId(request.params.id, reply);
      if (!id) return;

      const result = await controller.deleteDevice(null, reply, id);
      if (!result) return reply.notFound(ERRORS.DEVICE_NOT_FOUND);
      return reply.code(204).send();
    },
  );

  // ---------------- GET DEVICE DETAILS ----------------
  fastify.get(
    '/devices/:id/details',
    {
      schema: {
        summary: 'Деталі пристрою з зовнішнім типом',
        description:
          'Повертає дані пристрою з файлового сховища, збагачені інформацією про тип із зовнішнього JSON Server',
        tags: ['Devices'],
        params: deviceParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              device: { type: 'string' },
              status: { type: 'string' },
              room: { type: 'string' },
              description: { type: 'string' },
              image: { type: ['string', 'null'] },
              createdAt: { type: ['string', 'null'] },
              updatedAt: { type: ['string', 'null'] },
              typeDetails: {
                type: 'object',
                properties: {
                  type: { type: ['string', 'null'] },
                  powerWatt: { type: ['number', 'null'] },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = parseId(request.params.id, reply);
      if (!id) return;

      const externalBaseUrl =
        fastify.config.EXTERNAL_API_URL ?? 'http://localhost:3001';

      const result = await controller.getDeviceDetails(
        request,
        reply,
        id,
        externalBaseUrl,
      );

      return reply.code(200).send(result);
    },
  );

  // ---------------- EXPORT CSV ----------------
  fastify.get(
    '/devices/export',
    {
      schema: {
        summary: 'Експорт пристроїв у CSV',
        description:
          'Експортує всі пристрої у форматі CSV. При ?transform=true додає поле isActive на основі status.',
        tags: ['Devices'],
        querystring: {
          type: 'object',
          properties: {
            transform: { type: 'string', enum: ['true', 'false'] },
          },
          additionalProperties: false,
        },
        response: {
          200: { type: 'string' },
        },
      },
    },
    async (request, reply) => {
      return controller.exportDevices(request, reply);
    },
  );

  // ---------------- STREAM NDJSON ----------------
  fastify.get(
    '/devices/stream',
    {
      schema: {
        summary: 'Потоковий список пристроїв у NDJSON',
        description:
          "Відправляє записи по одному через Transform stream у форматі application/x-ndjson без завантаження всіх даних в пам'ять.",
        tags: ['Devices'],
      },
    },
    async (request, reply) => {
      return controller.streamDevices(request, reply);
    },
  );

  // ---------------- IMPORT ----------------
  fastify.post(
    '/devices/import',
    {
      schema: {
        summary: 'Імпорт пристроїв',
        description: 'Імпортує пристрої з наданого CSV файлу',
        tags: ['Devices'],
        response: {
          201: {
            type: 'object',
            properties: {
              imported: { type: 'number' },
              failed: { type: 'number' },
              errors: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await controller.importDevices(request);
      return reply.code(201).send(result);
    },
  );
}
