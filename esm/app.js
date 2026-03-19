import fastify from 'fastify';
import config from './config/env.js';
import errorHandler from './plugins/error-handler/index.js';
import apiRoutes from './routes/api.routes.js';

export default function buildApp() {
  const app = fastify({ logger: true });

  config.port = 9999;

  app.register(errorHandler);
  app.get('/api/health', async () => ({ status: 'ok' }));
  app.register(apiRoutes, { prefix: '/api' });

  return app;
}
