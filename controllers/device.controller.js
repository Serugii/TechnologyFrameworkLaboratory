import * as service from '#services';

export function getDevices(req, res, query) {
  const devices = service.listDevices(query.room);
  res.statusCode = 200;
  return { count: devices.length, items: devices };
}

export function postDevice(req, res, body) {
  const device = service.createDevice(body);
  res.statusCode = 201;
  return { message: 'Created', device };
}

export function patchDevice(req, res, id, body) {
  const device = service.updateDevice(id, body);
  res.statusCode = 200;
  return { message: 'Updated', device };
}

export function deleteDevice(req, res, id) {
  service.deleteDevice(id);
  res.statusCode = 200;
  return { message: 'Deleted' };
}
