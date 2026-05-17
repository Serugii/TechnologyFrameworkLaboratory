import Fastify from 'fastify';
import path from 'path';
import fastifyEnv from '@fastify/env';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import mysqlPlugin from './db/mysql.js';
import drizzlePlugin from './db/drizzle.js';
import redisPlugin from './db/redis.js';
import sessionPlugin from './plugins/session.plugin.js';

import deviceRoutes from '#routes';
import deviceRoutesV2 from './routes/device.routes.v2.js';
import githubRoutesV1 from './routes/github.routes.v1.js';
import githubRoutesV2 from './routes/github.routes.v2.js';
import deviceWsRoutes from './routes/device.ws.routes.js';
import backupRoutes from './routes/device.backup.routes.js';
import authRoutes from './routes/auth.routes.js';
import { envSchema } from '#schemas';

export async function buildApp(opts = {}) {
  /* eslint-disable no-restricted-properties */
  const isDev =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  /* eslint-enable no-restricted-properties */

  const fastify = Fastify({
    logger:
      opts.logger ??
      (isDev
        ? {
            level: 'info',
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            },
          }
        : { level: 'silent' }),
    disableRequestLogging: true,
    ...opts,
  });

  // ---------------- ENV ----------------
  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });

  await fastify.register(mysqlPlugin);
  await fastify.register(drizzlePlugin);
  await fastify.register(redisPlugin);
  await fastify.register(sessionPlugin);

  // ---------------- PLUGINS ----------------
  await fastify.register(cors, {
    origin: isDev ? '*' : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(helmet, { global: true });
  await fastify.register(sensible);

  await fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: fastify.redis,
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${context.after}`,
    }),
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Smart Home API',
        description: 'API для керування smart devices',
        version: '1.0.0',
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
    staticCSP: true,
  });

  await fastify.register(websocket);

  await fastify.register(deviceRoutes, { prefix: '/api/v1' });
  await fastify.register(deviceRoutesV2, { prefix: '/api/v2' });
  await fastify.register(githubRoutesV1, { prefix: '/api/v1' });
  await fastify.register(githubRoutesV2, { prefix: '/api/v2' });
  await fastify.register(deviceWsRoutes, { prefix: '/api/v1' });
  await fastify.register(backupRoutes, { prefix: '/api/v1' });
  await fastify.register(authRoutes, { prefix: '/api/v1' });

  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  // ---------------- ERROR HANDLER ----------------
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({
      error: error.message,
      method: request.method,
      url: request.url,
      statusCode: error.statusCode || 500,
    });
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  return fastify;
}
