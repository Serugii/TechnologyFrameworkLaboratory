import { createGithubServiceV2 } from '../services/github.service.v2.js';
import {
  githubQuerySchema,
  githubResponseSchema,
} from '../schemas/github.schema.js';

export default async function githubRoutesV2(fastify) {
  // Dependency Injection: передаємо redis через фабричну функцію
  const githubService = createGithubServiceV2({ redis: fastify.redis });

  fastify.get(
    '/github/shared-repos',
    {
      schema: {
        summary:
          'Топ-5 репозиторіїв зі спільними contributors (v2 REST+GraphQL)',
        description:
          'Аналізує contributors вхідного репо та знаходить 5 репозиторіїв з найбільшою кількістю спільних contributors. Реалізація через GitHub REST + GraphQL API. Потребує GITHUB_TOKEN.',
        tags: ['GitHub Analytics'],
        querystring: githubQuerySchema,
        response: { 200: githubResponseSchema },
      },
    },
    async (request, reply) => {
      const { repo } = request.query;
      const token = fastify.config.GITHUB_TOKEN ?? null;

      const start = Date.now();
      const result = await githubService.findSharedRepos(repo, token);
      result.meta.durationMs = Date.now() - start;

      return reply.code(200).send(result);
    },
  );
}
