import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupPath = path.join(__dirname, '../data/backup.json');

const users = [
  { id: 1, name: 'Charlie', role: 'admin' },
  { id: 2, name: 'Diana', role: 'user' },
];

let backupData = [];

export const init = async () => {
  try {
    const rawData = await fs.promises.readFile(backupPath, 'utf8');
    backupData = JSON.parse(rawData);
  } catch (err) {
    console.warn('Could not read backup file:', err.message);
  }
};

export const findAll = async () => {
  return [...users, ...backupData];
};

export const findById = async (id) => {
  return users.find((u) => u.id === parseInt(id, 10));
};
