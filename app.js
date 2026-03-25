import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import * as controller from '#controllers';
import { ERRORS } from '#constants';

import {
  deviceBodySchema,
  deviceUpdateSchema,
  deviceResponseSchema,
} from '#schemas';

// ---------------- ENV ----------------
const envSchema = {
  type: 'object',
  required: ['PORT', 'HOSTNAME', 'NODE_ENV', 'ADMIN_API_KEY'],
  properties: {
    PORT: { type: 'number' },
    HOSTNAME: { type: 'string' },
    NODE_ENV: { type: 'string', enum: ['development', 'production'] },
    ADMIN_API_KEY: { type: 'string' },
  },
};

// ---------------- FASTIFY INIT ----------------
const fastify = Fastify({ logger: true });
await fastify.register(fastifyEnv, {
  schema: envSchema,
  dotenv: true,
});
const isDev = fastify.config.NODE_ENV === 'development';
fastify.log.level = isDev ? 'info' : 'error';
await fastify.register(cors, {
  origin: isDev ? '*' : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
await fastify.register(helmet, {
  global: true,
});
await fastify.register(sensible);

// ---------------- ROUTES ----------------

// ROOT
fastify.get('/', async () => {
  fastify.log.info('GET /');
  return { message: 'Smart Home API працює' };
});

// HEALTH
fastify.get('/health', async () => {
  fastify.log.info('GET /health');

  return { status: 'ok' };
});

// HEALTH/DETAILS
fastify.get('/health/details', async () => {
  return {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  };
});

fastify.addHook('onRequest', async (request, reply) => {
  if (!request.url.startsWith('/health/details')) return;

  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
    return reply.unauthorized(ERRORS.UNAUTHORIZED);
  }
});

// GET devices
fastify.get('/devices', async (request, reply) => {
  fastify.log.info('GET /devices');

  const result = await controller.getDevices(null, reply, request.query);

  if (!result || result.length === 0) {
    return reply.notFound(ERRORS.DEVICE_NOT_FOUND);
  }

  return result;
});

// POST device
fastify.post(
  '/devices',
  {
    schema: {
      body: deviceBodySchema,
      response: {
        201: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            device: deviceResponseSchema,
          },
        },
      },
    },
  },
  async (request, reply) => {
    fastify.log.info('POST /devices');

    const result = controller.postDevice(null, reply, request.body);
    reply.code(201);
    return result;
  },
);

// PATCH device
fastify.patch(
  '/devices/:id',
  {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
      body: deviceUpdateSchema,
    },
  },
  async (request, reply) => {
    const id = Number(request.params.id);

    if (Number.isNaN(id)) {
      return reply.badRequest(ERRORS.INVALID_ID);
    }

    fastify.log.info(`PATCH /devices/${id}`);

    const result = await controller.patchDevice(null, reply, id, request.body);

    if (!result) {
      return reply.notFound(ERRORS.DEVICE_NOT_FOUND);
    }

    return result;
  },
);

// DELETE device
fastify.delete('/devices/:id', async (request, reply) => {
  const id = Number(request.params.id);

  if (Number.isNaN(id)) {
    return reply.badRequest(ERRORS.INVALID_ID);
  }

  fastify.log.info(`DELETE /devices/${id}`);

  const result = await controller.deleteDevice(null, reply, id);

  if (!result) {
    return reply.notFound(ERRORS.DEVICE_NOT_FOUND);
  }

  return result;
});

// ---------------- ERROR HANDLER ----------------
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({
    error,
    method: request.method,
    url: request.url,
  });

  const status = error.statusCode || 500;

  reply.status(status).send({
    error: error.message || 'Internal Server Error',
  });
});

// ---------------- onClose ----------------
fastify.addHook('onClose', async () => {
  fastify.log.info('Server is closing...');
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

// ---------------- graceful shutdown ----------------
function gracefulShutdown(signal) {
  fastify.log.info(`Received ${signal}. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    fastify.log.error('Force shutdown after timeout');
    process.exit(1);
  }, 10000);

  fastify.close((err) => {
    clearTimeout(timeout);

    if (err) {
      fastify.log.error('Error while shutting down:', err);
      process.exit(1);
    }

    fastify.log.info('Server closed successfully');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  fastify.log.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  fastify.log.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
