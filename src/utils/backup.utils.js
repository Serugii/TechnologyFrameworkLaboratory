import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
const MAX_BACKUPS = 5;

export const createBackup = async () => {
  try {
    await fsp.mkdir(BACKUPS_DIR, { recursive: true });

    const files = await fsp.readdir(ITEMS_DIR);

    if (files.length === 0) {
      console.log('No items to backup yet');
      return;
    }

    const timestamp = Date.now().toString();
    const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

    const chunks = [];
    for (const file of files) {
      const content = await fsp.readFile(path.join(ITEMS_DIR, file));
      chunks.push(content);
      chunks.push(Buffer.from('\n'));
    }
    const combined = Buffer.concat(chunks);

    await pipeline(
      Readable.from(combined),
      createGzip(),
      fs.createWriteStream(backupPath),
    );

    console.log(`Backup created: ${timestamp}.gz`);

    await cleanupOldBackups();
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No items to backup yet');
      return;
    }
    console.error('Backup failed:', error);
  }
};

const cleanupOldBackups = async () => {
  try {
    const entries = await fsp.readdir(BACKUPS_DIR);

    const backups = entries
      .filter((name) => name.endsWith('.gz'))
      .sort(
        (a, b) => Number(a.replace('.gz', '')) - Number(b.replace('.gz', '')),
      );

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
