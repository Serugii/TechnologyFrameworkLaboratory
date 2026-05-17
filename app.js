import { buildApp } from './src/app.js';
import { createBackup } from '#utils/backup.utils.js';

/* eslint-disable no-restricted-properties */
const isDev = process.env.NODE_ENV === 'development';
/* eslint-enable no-restricted-properties */

const fastify = await buildApp({
  logger: isDev
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
    : { level: 'error' },
});

// ---------------- LOGGING HOOKS (тільки для runtime) ----------------
if (isDev) {
  fastify.addHook('onRequest', async (request) => {
    fastify.log.info({
      msg: 'incoming request',
      method: request.method,
      url: request.url,
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    fastify.log.info({
      msg: 'request completed',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    });
  });
}

if (!isDev) {
  fastify.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode >= 400) {
      fastify.log.error({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      });
    }
  });
}

// ---------------- STARTUP ----------------
await createBackup(fastify.mysql);

try {
  await fastify.listen({
    port: fastify.config.PORT,
    host: fastify.config.HOSTNAME,
  });

  fastify.log.info(
    `Server running at ${fastify.config.HOSTNAME}:${fastify.config.PORT}`,
  );
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// ---------------- GRACEFUL SHUTDOWN ----------------
const gracefulShutdown = (signal) => {
  fastify.log.info(`Received ${signal}, shutting down...`);

  const timeout = setTimeout(() => {
    fastify.log.error('Force shutdown');
    process.exit(1);
  }, 10000);

  fastify.close((err) => {
    clearTimeout(timeout);
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => gracefulShutdown(err));
process.on('unhandledRejection', (reason) => gracefulShutdown(reason));
