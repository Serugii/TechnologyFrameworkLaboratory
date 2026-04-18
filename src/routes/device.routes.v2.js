import * as controller from '#controllers';
import { paginationQuerySchema, deviceResponseSchema } from '#schemas';

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
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: deviceResponseSchema,
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await controller.getDevicesPaginated(request.query);
      return reply.code(200).send(result);
    },
  );
}
