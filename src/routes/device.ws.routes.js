import { deviceEvents } from '../events/device.events.js';
import * as repository from '../repositories/device.repository.js';

export default async function deviceWsRoutes(fastify) {
  const clients = new Set();

  // ---------------- BROADCAST ----------------
  const broadcast = (payload) => {
    const message = JSON.stringify(payload);
    for (const socket of clients) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  };

  // ---------------- ПІДПИСКА НА ПОДІЇ ----------------
  deviceEvents.on('device:created', (payload) => broadcast(payload));
  deviceEvents.on('device:updated', (payload) => broadcast(payload));
  deviceEvents.on('device:deleted', (payload) => broadcast(payload));

  // ---------------- WS ENDPOINT ----------------
  fastify.get('/devices/ws', { websocket: true }, async (socket) => {
    clients.add(socket);

    try {
      const devices = await repository.findAll();
      socket.send(JSON.stringify({ event: 'init', data: devices }));
    } catch (err) {
      socket.send(
        JSON.stringify({ event: 'error', message: 'Could not load devices' }),
      );
    }

    socket.on('close', () => {
      clients.delete(socket);
    });
  });
}
