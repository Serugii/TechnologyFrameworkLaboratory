import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ERRORS } from '#constants';
import {
  backupParamsSchema,
  backupHeadersSchema,
  backupResponseSchema,
} from '#schemas';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export default async function backupRoutes(fastify) {
  // ---------------- AUTH HOOK ----------------
  fastify.addHook('onRequest', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
      return reply.unauthorized(ERRORS.UNAUTHORIZED);
    }
  });

  // ---------------- GET BACKUP ----------------
  fastify.get(
    '/backups/:timestamp',
    {
      schema: {
        summary: 'Отримати backup-файл',
        description:
          'Потоково віддає стиснений backup-файл за вказаним timestamp. Захищено API ключем (x-api-key).',
        tags: ['Backups'],
        params: backupParamsSchema,
        headers: backupHeadersSchema,
        response: backupResponseSchema,
      },
    },
    async (request, reply) => {
      const { timestamp } = request.params;

      const filePath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

      try {
        await fsp.access(filePath);
      } catch {
        return reply.notFound(`Backup ${timestamp} not found`);
      }

      const stream = fs.createReadStream(filePath);

      return reply
        .code(200)
        .header('Content-Type', 'application/gzip')
        .header('Content-Disposition', `attachment; filename="${timestamp}.gz"`)
        .send(stream);
    },
  );
}
