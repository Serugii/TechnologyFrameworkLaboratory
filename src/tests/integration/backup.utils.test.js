import { describe, it, expect, vi, afterEach } from 'vitest';
import { createBackup } from '../../utils/backup.utils.js';
import fs from 'fs/promises';
import path from 'path';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

async function clearBackups() {
  try {
    await fs.rm(BACKUPS_DIR, { recursive: true, force: true });
  } catch {}
}

afterEach(async () => {
  await clearBackups();
  vi.restoreAllMocks();
});

function makePool(rows = []) {
  return { query: vi.fn(async () => [rows]) };
}

describe('createBackup — інтеграція з файловою системою', () => {
  it('не створює файл якщо таблиця порожня', async () => {
    await createBackup(makePool([]));

    let files = [];
    try {
      files = await fs.readdir(BACKUPS_DIR);
    } catch {}
    const gzFiles = files.filter((f) => f.endsWith('.gz'));
    expect(gzFiles).toHaveLength(0);
  });

  it('створює .gz файл бекапу з правильним вмістом', async () => {
    const rows = [
      { id: 1, device: 'lamp', room: 'hall', status: 'on' },
      { id: 2, device: 'fan', room: 'bedroom', status: 'off' },
    ];
    await createBackup(makePool(rows));

    const files = await fs.readdir(BACKUPS_DIR);
    const gzFiles = files.filter((f) => f.endsWith('.gz'));
    expect(gzFiles).toHaveLength(1);

    const backupPath = path.join(BACKUPS_DIR, gzFiles[0]);
    const tmpPath = backupPath.replace('.gz', '.json');

    await pipeline(
      createReadStream(backupPath),
      createGunzip(),
      createWriteStream(tmpPath),
    );

    const content = await fs.readFile(tmpPath, 'utf8');
    const lines = content.trim().split('\n').map(JSON.parse);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ id: 1, device: 'lamp' });

    await fs.unlink(tmpPath);
  });

  it('видаляє старі бекапи якщо їх більше 5', async () => {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    for (let i = 1; i <= 5; i++) {
      await fs.writeFile(path.join(BACKUPS_DIR, `${1000 + i}.gz`), '');
    }

    const rows = [{ id: 1, device: 'lamp', room: 'hall', status: 'on' }];
    await createBackup(makePool(rows));

    const files = await fs.readdir(BACKUPS_DIR);
    const gzFiles = files.filter((f) => f.endsWith('.gz'));
    expect(gzFiles).toHaveLength(5);
  });
});
