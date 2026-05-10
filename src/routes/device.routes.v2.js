import { createDeviceServiceV2 } from '../services/device.service.v2.js';
import { ERRORS } from '#constants';
import {
  paginationQuerySchema,
  paginatedDevicesResponseSchema,
  deviceBodySchema,
  deviceUpdateSchema,
  deviceParamsSchema,
  deviceCreateResponseSchema,
  devicePatchResponseSchema,
} from '#schemas';

export default async function deviceRoutesV2(fastify) {
  // Dependency Injection: передаємо repository та redis через фабричну функцію
  const deviceService = createDeviceServiceV2({
    repository: fastify.repository,
    redis: fastify.redis,
  });

  // ---------------- GET /devices (з кешуванням) ----------------
  fastify.get(
    '/devices',
    {
      schema: {
        summary: 'Отримання списку пристроїв',
        description:
          'Отримати список пристроїв з пагінацією. Відповідь кешується в Redis на 24 години.',
        tags: ['Devices'],
        querystring: paginationQuerySchema,
        response: {
          200: paginatedDevicesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const limit = request.query.limit || 5;
      const result = await deviceService.listPaginated(page, limit);
      return reply.code(200).send(result);
    },
  );

  // ---------------- POST /devices (інвалідація кешу) ----------------
  fastify.post(
    '/devices',
    {
      schema: {
        summary: 'Створення нового пристрою',
        description:
          'Додавання нового пристрою. Інвалідує кеш списку пристроїв.',
        tags: ['Devices'],
        body: deviceBodySchema,
        response: { 201: deviceCreateResponseSchema },
      },
    },
    async (request, reply) => {
      const device = await fastify.repository.create(request.body);
      await deviceService.invalidatePaginatedCache();
      return reply.code(201).send({ message: 'Created', device });
    },
  );

  // ---------------- PATCH /devices/:id (інвалідація кешу) ----------------
  fastify.patch(
    '/devices/:id',
    {
      schema: {
        summary: 'Оновлення пристрою',
        description:
          'Оновлення інформації про пристрій. Інвалідує кеш списку пристроїв.',
        tags: ['Devices'],
        params: deviceParamsSchema,
        body: deviceUpdateSchema,
        response: { 200: devicePatchResponseSchema },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (Number.isNaN(id)) return reply.badRequest(ERRORS.INVALID_ID);

      const device = await fastify.repository.update(id, request.body);
      if (!device) return reply.notFound(ERRORS.DEVICE_NOT_FOUND);

      await deviceService.invalidatePaginatedCache();
      return reply.code(200).send({ message: 'Updated', device });
    },
  );

  // ---------------- DELETE /devices/:id (інвалідація кешу) ----------------
  fastify.delete(
    '/devices/:id',
    {
      schema: {
        summary: 'Видалення пристрою',
        description: 'Видалення пристрою. Інвалідує кеш списку пристроїв.',
        tags: ['Devices'],
        params: deviceParamsSchema,
        response: { 204: { type: 'null' } },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (Number.isNaN(id)) return reply.badRequest(ERRORS.INVALID_ID);

      const success = await fastify.repository.remove(id);
      if (!success) return reply.notFound(ERRORS.DEVICE_NOT_FOUND);

      await deviceService.invalidatePaginatedCache();
      return reply.code(204).send();
    },
  );
}
