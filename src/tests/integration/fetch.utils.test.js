import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchExternal } from '../../utils/fetch.utils.js';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'reference.json');

async function clearCache() {
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
  } catch {}
}

beforeEach(async () => {
  await clearCache();
});

afterEach(async () => {
  await clearCache();
  vi.restoreAllMocks();
});

describe('fetchExternal — кешування та мережеві запити', () => {
  it('повертає дані з мережі і зберігає їх у кеш', async () => {
    const mockData = [{ type: 'lamp', powerWatt: 10 }];

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => mockData })),
    );

    const result = await fetchExternal('http://fake-api/deviceTypes?type=lamp');
    expect(result).toEqual(mockData);

    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const cache = JSON.parse(raw);
    expect(Object.keys(cache)).toHaveLength(1);
  });

  it('повертає закешовані дані без повторного fetch', async () => {
    const mockData = { cached: true };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => mockData,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const url = 'http://fake-api/items';
    await fetchExternal(url);
    const result = await fetchExternal(url);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData);
  });

  it('не використовує кеш якщо запис прострочений (TTL)', async () => {
    const mockData = { fresh: true };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => mockData,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const url = 'http://fake-api/ttl-test';

    await fetchExternal(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const raw = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    const key = Object.keys(raw)[0];
    raw[key].cachedAt = Date.now() - 200 * 1000;
    await fs.writeFile(CACHE_FILE, JSON.stringify(raw), 'utf8');

    await fetchExternal(url);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('повертає null і не кидає виняток при мережевій помилці', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Network error');
      }),
    );

    const result = await fetchExternal('http://unreachable/api');
    expect(result).toBeNull();
  }, 15_000);

  it('повертає null при HTTP помилці (не-2xx статус)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })),
    );

    const result = await fetchExternal('http://fake-api/down');
    expect(result).toBeNull();
  }, 15_000);
});
