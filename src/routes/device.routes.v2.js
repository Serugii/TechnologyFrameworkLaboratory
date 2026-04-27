import * as controller from '#controllers';
import {
  paginationQuerySchema,
  paginatedDevicesResponseSchema,
} from '#schemas';

export default async function deviceRoutesV2(fastify) {
  fastify.get(
    '/devices',
    {
      schema: {
        summary: 'Отримання списку пристроїв',
        description: 'Отримати список пристроїв з пагінацією',
        tags: ['Devices'],
        querystring: paginationQuerySchema,
        response: {
          200: paginatedDevicesResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await controller.getDevicesPaginated(request.query);
      return reply.code(200).send(result);
    },
  );
}
