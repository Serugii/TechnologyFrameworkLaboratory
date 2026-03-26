import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import deviceRoutes from '#routes';
import { envSchema } from '#schemas';

// ---------------- ENV (TEMP FASTIFY FOR CONFIG) ----------------
const fastifyTemp = Fastify();
await fastifyTemp.register(fastifyEnv, {
  schema: envSchema,
  dotenv: true,
});

const isDev = fastifyTemp.config.NODE_ENV === 'development';

// ---------------- LOGGER CONFIG ----------------
const loggerConfig = isDev
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
  : {
      level: 'error',
    };

// ---------------- FASTIFY INIT ----------------
const fastify = Fastify({
  logger: loggerConfig,
  disableRequestLogging: true,
});

// ---------------- REGISTER ENV ----------------
await fastify.register(fastifyEnv, {
  schema: envSchema,
  dotenv: true,
});

// ---------------- HOOKS (LOGGING) ----------------

// DEVELOPMENT → логуємо ВСІ запити
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

// PRODUCTION → логуємо тільки помилки
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

// ---------------- PLUGINS ----------------
await fastify.register(cors, {
  origin: isDev ? '*' : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});

await fastify.register(helmet, { global: true });
await fastify.register(sensible);

// ---------------- ROUTES ----------------
await fastify.register(deviceRoutes);

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

// ---------------- START ----------------
const start = async () => {
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
};

await start();

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
