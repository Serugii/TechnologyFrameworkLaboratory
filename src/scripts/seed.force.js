import 'dotenv/config';
import mongoose from 'mongoose';
import { DeviceModel } from '../db/models/device.model.js';

const DEVICES = [
  { device: 'Smart Lamp', status: 'on', room: 'Kitchen' },
  { device: 'Air Conditioner', status: 'off', room: 'Bedroom' },
  { device: 'TV', status: 'on', room: 'Living Room' },
];

const seedForce = async () => {
  try {
    // eslint-disable-next-line no-restricted-properties
    await mongoose.connect(`${process.env.MONGO_URL}/${process.env.MONGO_DB_NAME}`);

    await DeviceModel.deleteMany({});
    await DeviceModel.insertMany(DEVICES);

    console.log('Force seeding completed');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedForce();
