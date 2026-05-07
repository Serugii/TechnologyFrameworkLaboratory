import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
const MAX_BACKUPS = 5;

export const createBackup = async (pool) => {
  try {
    await fsp.mkdir(BACKUPS_DIR, { recursive: true });

    const [rows] = await pool.query('SELECT * FROM devices ORDER BY id ASC');

    if (rows.length === 0) {
      console.log('No items to backup yet');
      return;
    }

    const timestamp = Date.now().toString();
    const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

    const combined = Buffer.from(
      rows.map((row) => JSON.stringify(row)).join('\n'),
    );

    await pipeline(
      Readable.from(combined),
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
