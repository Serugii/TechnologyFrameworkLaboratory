import fs from 'fs/promises';
import path from 'path';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export const createBackup = async () => {
  try {
    const timestamp = Date.now().toString();
    const backupDir = path.join(BACKUPS_DIR, timestamp);

    await fs.mkdir(backupDir, { recursive: true });

    const files = await fs.readdir(ITEMS_DIR);

    for (const file of files) {
      const src = path.join(ITEMS_DIR, file);
      const dest = path.join(backupDir, file);

      await fs.copyFile(src, dest);
    }

    console.log(`Backup created: ${timestamp}`);

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
    const dirs = await fs.readdir(BACKUPS_DIR);

    const sorted = dirs.sort((a, b) => Number(a) - Number(b));

    if (sorted.length <= 5) return;

    const toDelete = sorted.slice(0, sorted.length - 5);

    for (const dir of toDelete) {
      const fullPath = path.join(BACKUPS_DIR, dir);
      await fs.rm(fullPath, { recursive: true });
      console.log(`Deleted old backup: ${dir}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Cleanup failed:', error);
    }
  }
};
