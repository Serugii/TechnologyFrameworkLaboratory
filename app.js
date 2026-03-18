import { createServer } from 'node:http';
import config from '#config';
import logger from '#utils';
import * as controller from '#controllers';

const server = createServer((req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  function sendResponse(payload) {
    res.end(JSON.stringify(payload));
  }

  let body = '';

  req.on('data', (chunk) => (body += chunk.toString()));

  req.on('end', () => {
    try {
      // ROOT
      if (method === 'GET' && path === '/') {
        res.statusCode = 200;
        logger.handleLog(method, path, res.statusCode);
        return sendResponse({ message: 'Smart Home API працює' });
      }

      // HEALTH
      if (method === 'GET' && path === '/health') {
        res.statusCode = 200;
        logger.handleLog(method, path, res.statusCode);
        return sendResponse({
          status: 'ok',
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        });
      }

      // GET devices
      if (method === 'GET' && path === '/devices') {
        const data = controller.getDevices(req, res, url.searchParams);
        logger.handleLog(method, path, res.statusCode);
        return sendResponse(data);
      }

      // POST device
      if (method === 'POST' && path === '/devices') {
        const data = JSON.parse(body || '{}');
        const result = controller.postDevice(req, res, data);
        logger.handleLog(method, path, res.statusCode);
        return sendResponse(result);
      }

      // PATCH device
      if (method === 'PATCH' && path.startsWith('/devices/')) {
        const id = parseInt(path.split('/')[2]);
        const updates = JSON.parse(body || '{}');
        const result = controller.patchDevice(req, res, id, updates);
        logger.handleLog(method, path, res.statusCode);
        return sendResponse(result);
      }

      // DELETE device
      if (method === 'DELETE' && path.startsWith('/devices/')) {
        const id = parseInt(path.split('/')[2]);
        const result = controller.deleteDevice(req, res, id);
        logger.handleLog(method, path, res.statusCode);
        return sendResponse(result);
      }

      res.statusCode = 404;
      logger.handleLog(method, path, res.statusCode);
      return sendResponse({ error: 'Route not found' });
    } catch (err) {
      res.statusCode = err.statusCode || 400;
      logger.handleLog(method, path, res.statusCode);
      return sendResponse({ error: err.message || err });
    }
  });
});

server.listen(config.PORT, config.HOSTNAME, () => {
  console.log(`Server running at http://${config.HOSTNAME}:${config.PORT}`);
});

// graceful shutdown
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  const timeout = setTimeout(() => {
    console.error('Force shutdown after timeout');
    process.exit(1);
  }, 10000);

  server.close((err) => {
    clearTimeout(timeout);
    if (err) {
      console.error('Error while shutting down:', err);
      process.exit(1);
    }
    console.log('Server closed successfully');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
