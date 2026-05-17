import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      /* eslint-disable no-restricted-properties */
      process.env[key] = value;
    }
  } catch {}
}

loadEnvFile(resolve(process.cwd(), '.env.test'));

process.env.NODE_ENV = 'test';
/* eslint-enable no-restricted-properties */
