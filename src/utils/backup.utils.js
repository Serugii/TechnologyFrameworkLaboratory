import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable, Transform } from 'stream';
import { DeviceModel } from '../db/models/device.model.js';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
const MAX_BACKUPS = 5;

export const createBackup = async () => {
  try {
    await fsp.mkdir(BACKUPS_DIR, { recursive: true });

    const timestamp = Date.now().toString();
    const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

    const cursor = DeviceModel.find().lean().cursor();

    const jsonTransform = new Transform({
      objectMode: true,
      transform(chunk, _, callback) {
        callback(null, JSON.stringify(chunk) + '\n');
      },
    });

    await pipeline(
      cursor,
      jsonTransform,
      createGzip(),
      fs.createWriteStream(backupPath),
    );

    console.log(`Backup created: ${timestamp}.gz`);

    await cleanupOldBackups();
  } catch (error) {
    console.error('Backup failed:', error);
  }
};

const cleanupOldBackups = async () => {
  try {
    const entries = await fsp.readdir(BACKUPS_DIR);

    const backups = entries
      .filter((name) => name.endsWith('.gz'))
      .sort((a, b) => {
        const aTime = Number(a.replace('.gz', ''));
        const bTime = Number(b.replace('.gz', ''));
        return aTime - bTime;
      });

    if (backups.length <= MAX_BACKUPS) return;

    const toDelete = backups.slice(0, backups.length - MAX_BACKUPS);

    for (const file of toDelete) {
      await fsp.unlink(path.join(BACKUPS_DIR, file));
      console.log(`Deleted old backup: ${file}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Cleanup failed:', error);
    }
  }
};
