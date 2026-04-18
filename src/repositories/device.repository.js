import fs from 'fs/promises';
import path from 'path';
import { createItemModel } from '#models';
import { getFilePath, ensureDir, writeAtomic } from '../utils/file.utils.js';

const DIR = path.join(process.cwd(), 'data', 'items');

export async function findAll() {
  await ensureDir();

  const files = await fs.readdir(DIR);

  const items = await Promise.all(
    files.map(async (file) => {
      const content = await fs.readFile(path.join(DIR, file), 'utf8');
      return JSON.parse(content);
    }),
  );

  return items;
}

export async function findById(id) {
  try {
    const filePath = getFilePath(id);
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function create(data) {
  await ensureDir();

  const id = await generateId();

  const item = createItemModel({
    ...data,
    id,
  });

  const filePath = getFilePath(id);
  await writeAtomic(filePath, item);

  return item;
}

const generateId = async () => {
  const files = await fs.readdir(DIR);

  if (files.length === 0) return 1;

  const ids = files
    .map((file) => parseInt(file.replace('.json', ''), 10))
    .filter((id) => !isNaN(id));

  return Math.max(...ids) + 1;
};

export async function update(id, updates) {
  const existing = await findById(id);
  if (!existing) return null;

  const updated = createItemModel({
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  });

  const filePath = getFilePath(id);
  await writeAtomic(filePath, updated);

  return updated;
}

export async function remove(id) {
  try {
    const filePath = getFilePath(id);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function findWithDetails(id) {
  return findById(id);
}
