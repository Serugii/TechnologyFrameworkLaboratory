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
      const result = await controller.getDevices(null, reply, request.query);

      if (!result || result.items.length === 0) {
        return reply.notFound(ERRORS.DEVICE_NOT_FOUND);
      }

      return result;
    },
  );

  // ---------------- POST DEVICE ----------------
  fastify.post(
    '/devices',
    {
      schema: {
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
  fastify.post('/items/:id/image', async (request, reply) => {
    const id = parseId(request.params.id, reply);
    if (!id) return;

    const data = await request.file();

    if (!data) {
      throw { statusCode: 400, message: 'File is required' };
    }

    // ---------------- VALIDATE TYPE ----------------
    if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
      throw { statusCode: 400, message: 'Only JPEG and PNG allowed' };
    }

    // ---------------- LIMIT SIZE ----------------
    if (data.file.truncated) {
      throw { statusCode: 400, message: 'File too large (max 5MB)' };
    }

    const fileBuffer = await data.toBuffer();

    const result = await controller.uploadDeviceImage(
      request,
      reply,
      id,
      data,
      fileBuffer,
    );

    return result;
  });

  // ---------------- PATCH DEVICE ----------------
  fastify.patch(
    '/devices/:id',
    {
      schema: {
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
        params: deviceParamsSchema,
        response: { 200: deviceDeleteResponseSchema },
      },
    },
    async (request, reply) => {
      const id = parseId(request.params.id, reply);
      if (!id) return;

      const result = await controller.deleteDevice(null, reply, id);

      if (!result) return reply.notFound(ERRORS.DEVICE_NOT_FOUND);

      return { message: 'Device deleted.' };
    },
  );

  // ---------------- EXPORT CSV ----------------
  fastify.get('/devices/export', async (request, reply) => {
    return controller.exportDevices(request, reply);
  });

  // ---------------- IMPORT ----------------
  fastify.post('/devices/import', async (request, reply) => {
    return controller.importDevices(request, reply);
  });
}
