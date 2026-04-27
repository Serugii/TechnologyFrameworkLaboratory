import * as service from '#services';
import { deviceBodySchema } from '#schemas';
import { NdjsonTransform } from '#transforms/ndjson.transform.js';
import { deviceEvents } from '../events/device.events.js';

export async function getDevices(query) {
  const devices = await service.listDevices(query.room);
  return { count: devices.length, items: devices };
}

export async function getDevicesPaginated(query) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  return service.listDevicesPaginated(page, limit);
}

export async function postDevice(req, res, body) {
  const device = await service.createDevice(body);

  deviceEvents.emit('device:created', { event: 'created', data: device });

  res.statusCode = 201;
  return { message: 'Created', device };
}

export async function patchDevice(req, res, id, body) {
  const device = await service.updateDevice(id, body);

  deviceEvents.emit('device:updated', { event: 'updated', data: device });

  res.statusCode = 200;
  return { message: 'Updated', device };
}

export async function deleteDevice(req, res, id) {
  await service.deleteDevice(id);

  deviceEvents.emit('device:deleted', { event: 'deleted', id });

  res.statusCode = 204;
  return { message: 'Deleted' };
}

export async function exportDevices(req, res) {
  const baseUrl = `${req.protocol}://${req.headers.host}`;
  const withTransform = req.query.transform === 'true';

  res.header('Content-Disposition', 'attachment; filename="items.csv"');
  res.header('Content-Type', 'text/csv');

  return service.exportDevicesStream(baseUrl, withTransform);
}

export async function streamDevices(req, reply) {
  const source = await service.streamDevices();
  const ndjson = new NdjsonTransform();

  reply.type('application/x-ndjson');
  return reply.send(source.pipe(ndjson));
}

export async function importDevices(req) {
  const data = await req.file();
  if (!data) {
    throw { statusCode: 400, message: 'File is required' };
  }
  const buffer = await data.toBuffer();
  const validate = req.server.validatorCompiler({ schema: deviceBodySchema });
  return service.importDevices(buffer, data.filename, data.mimetype, validate);
}

export async function uploadDeviceImage(req, res, id, file, buffer) {
  const device = await service.getDeviceById(id);
  if (!device) {
    throw { statusCode: 404, message: 'Device not found' };
  }
  const result = await service.saveDeviceImage(id, file, buffer);
  res.statusCode = 200;
  return { message: 'Image uploaded', image: result.image };
}

export async function getDeviceDetails(req, res, id, externalBaseUrl) {
  const result = await service.getDeviceDetails(id, externalBaseUrl);
  if (!result) {
    throw { statusCode: 404, message: 'Device not found' };
  }
  return result;
}
