import fs from 'fs/promises';
import path from 'path';
import { createItemModel } from '#models';
import { writeAtomic } from '#utils/file.utils.js';
import { getModelHash } from '#utils/hash.utils.js';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const VERSION_FILE = path.resolve('data/version.json');

const readVersion = async () => {
  try {
    const content = await fs.readFile(VERSION_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
};

const writeVersion = async (hash) => {
  const data = { hash };
  await writeAtomic(VERSION_FILE, data);
};

const migrate = async () => {
  try {
    console.log('Migration started...');

    const currentHash = getModelHash();
    const version = await readVersion();

    if (version && version.hash === currentHash) {
      console.log('Schema is up to date. No migration needed.');
      return;
    }

    console.log('Schema changed. Migrating data...');

    let files = [];
    try {
      files = await fs.readdir(ITEMS_DIR);
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('ℹNo data to migrate');
        await writeVersion(currentHash);
        return;
      }
      throw e;
    }

    for (const file of files) {
      const filePath = path.join(ITEMS_DIR, file);

      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      const migrated = createItemModel(data);

      await writeAtomic(filePath, migrated);
    }

    await writeVersion(currentHash);

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

migrate();
