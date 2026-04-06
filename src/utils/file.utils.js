import fs from 'fs/promises';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'data', 'items');

export const getFilePath = (id) => {
  return path.join(BASE_DIR, `${id}.json`);
};

export const ensureDir = async () => {
  await fs.mkdir(BASE_DIR, { recursive: true });
};

export const writeAtomic = async (filePath, data) => {
  const tmpPath = filePath.replace('.json', '.tmp.json');

  try {
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tmpPath);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('Cleanup error:', e);
      }
    }
    throw error;
  }
};
