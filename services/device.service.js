const repository = require('#repositories');
const {
  validate,
  createDeviceSchema,
  updateDeviceSchema,
} = require('#validators');

function listDevices(room) {
  let devices = repository.getAll();
  if (room) {
    devices = devices.filter(
      (d) => d.room.toLowerCase() === room.toLowerCase(),
    );
  }
  return devices;
}

function createDevice(data) {
  validate(createDeviceSchema, data);
  const lastId =
    repository.getAll().length > 0 ? repository.getAll().slice(-1)[0].id : 0;
  const device = { id: lastId + 1, status: 'off', ...data };
  return repository.add(device);
}

function updateDevice(id, updates) {
  validate(updateDeviceSchema, updates);
  if (updates.id) throw { statusCode: 400, message: 'Cannot update id field' };
  const device = repository.update(id, updates);
  if (!device) throw { statusCode: 404, message: 'Device not found' };
  return device;
}

function deleteDevice(id) {
  if (!repository.remove(id))
    throw { statusCode: 404, message: 'Device not found' };
}

module.exports = { listDevices, createDevice, updateDevice, deleteDevice };
