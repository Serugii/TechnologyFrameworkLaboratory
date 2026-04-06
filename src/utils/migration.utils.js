import fs from 'fs/promises';
import path from 'path';
import { getModelHash } from '#utils/hash.utils.js';

const VERSION_FILE = path.resolve('data/version.json');

export const checkMigrationNeeded = async (fastify) => {
  try {
    const content = await fs.readFile(VERSION_FILE, 'utf8');
    const version = JSON.parse(content);

    const currentHash = getModelHash();

    if (version.hash !== currentHash) {
      fastify.log.warn(
        'Data schema changed. Run "npm run migrate" to update existing files.',
      );
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      fastify.log.warn(
        'No version file found. Run "npm run migrate" to initialize schema.',
      );
    } else {
      fastify.log.error(e);
    }
  }
};
