import { findSharedReposV1 } from '../services/github.service.v1.js';
import {
  githubQuerySchema,
  githubResponseSchema,
} from '../schemas/github.schema.js';

export default async function githubRoutesV1(fastify) {
  fastify.get(
    '/github/shared-repos',
    {
      schema: {
        summary: 'Топ-5 репозиторіїв зі спільними contributors (v1 REST)',
        description:
          'Аналізує contributors вхідного репо та знаходить 5 репозиторіїв з найбільшою кількістю спільних contributors. Реалізація через GitHub REST API.',
        tags: ['GitHub Analytics'],
        querystring: githubQuerySchema,
        response: { 200: githubResponseSchema },
      },
    },
    async (request, reply) => {
      const { repo } = request.query;
      const token = fastify.config.GITHUB_TOKEN ?? null;

      const start = Date.now();
      const result = await findSharedReposV1(repo, token);
      result.meta.durationMs = Date.now() - start;

      return reply.code(200).send(result);
    },
  );
}
