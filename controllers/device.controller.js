const service = require('#services');

function getDevices(req, res, query) {
  const devices = service.listDevices(query.room);
  res.statusCode = 200;
  return { count: devices.length, items: devices };
}

function postDevice(req, res, body) {
  const device = service.createDevice(body);
  res.statusCode = 201;
  return { message: 'Created', device };
}

function patchDevice(req, res, id, body) {
  const device = service.updateDevice(id, body);
  res.statusCode = 200;
  return { message: 'Updated', device };
}

function deleteDevice(req, res, id) {
  service.deleteDevice(id);
  res.statusCode = 200;
  return { message: 'Deleted' };
}

module.exports = { getDevices, postDevice, patchDevice, deleteDevice };
