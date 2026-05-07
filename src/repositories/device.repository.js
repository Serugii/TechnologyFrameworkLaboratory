import { DeviceModel } from '../db/models/device.model.js';
import { mapDevice } from '../db/mappers/device.mapper.js';
import mongoose from 'mongoose';

export async function findAll() {
  const devices = await DeviceModel.find().lean();
  return devices.map(mapDevice);
}

export async function findById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const device = await DeviceModel.findById(id).lean();
  return device ? mapDevice(device) : null;
}

export function streamAll() {
  return DeviceModel.find().lean().cursor();
}

export async function create(data) {
  const device = await DeviceModel.create(data);
  return mapDevice(device.toObject());
}

export async function update(id, updates) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const device = await DeviceModel.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  return device ? mapDevice(device) : null;
}

export async function remove(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;

  const result = await DeviceModel.findByIdAndDelete(id);
  return !!result;
}

export async function findPaginated(offset, limit) {
  const [items, total] = await Promise.all([
    DeviceModel.find().skip(offset).limit(limit).lean(),
    DeviceModel.countDocuments(),
  ]);

  return {
    items: items.map(mapDevice),
    total,
  };
}
