import fs from 'fs/promises';
import path from 'path';
import { createItemModel } from '#models';
import { getFilePath, ensureDir, writeAtomic } from '#utils/file.utils.js';

const DEVICES = [
  { id: 1, device: 'Smart Lamp', status: 'on', room: 'Kitchen' },
  { id: 2, device: 'Air Conditioner', status: 'off', room: 'Bedroom' },
  { id: 3, device: 'TV', status: 'on', room: 'Living Room' },
];

const seed = async () => {
  try {
    const DIR = path.join(process.cwd(), 'data', 'items');

    await fs.rm(DIR, { recursive: true }).catch(() => {});
    await ensureDir();

    for (const device of DEVICES) {
      const item = createItemModel(device);
      const filePath = getFilePath(item.id);

      await writeAtomic(filePath, item);
    }

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

seed();
