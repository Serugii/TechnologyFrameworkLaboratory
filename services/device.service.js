import * as repository from '#repositories';
import { validate, createDeviceSchema, updateDeviceSchema } from '#validators';

export function listDevices(room) {
  let devices = repository.getAll();
  if (room) {
    devices = devices.filter(
      (d) => d.room.toLowerCase() === room.toLowerCase(),
    );
  }
  return devices;
}

export function createDevice(data) {
  validate(createDeviceSchema, data);
  const allDevices = repository.getAll();
  const lastId =
    allDevices.length > 0 ? allDevices[allDevices.length - 1].id : 0;
  const device = { id: lastId + 1, status: 'off', ...data };
  return repository.add(device);
}

export function updateDevice(id, updates) {
  validate(updateDeviceSchema, updates);
  if (updates.id) throw { statusCode: 400, message: 'Cannot update id field' };
  const device = repository.update(id, updates);
  if (!device) throw { statusCode: 404, message: 'Device not found' };
  return device;
}

export function deleteDevice(id) {
  if (!repository.remove(id))
    throw { statusCode: 404, message: 'Device not found' };
}
