import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(async () => {
      throw { code: 'ENOENT' };
    }),
    writeFile: vi.fn(async () => {}),
    mkdir: vi.fn(async () => {}),
  },
}));

import { fetchExternal } from '../../utils/fetch.utils.js';
import fs from 'fs/promises';

beforeEach(() => {
  vi.clearAllMocks();
  fs.readFile.mockRejectedValue({ code: 'ENOENT' });
  fs.writeFile.mockResolvedValue(undefined);
  fs.mkdir.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fetchExternal — ізольована логіка (unit)', () => {
  it('успішно отримує дані і викликає запис у кеш', async () => {
    const mockData = { id: 1, type: 'lamp' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => mockData })),
    );

    const result = await fetchExternal('http://api/items');

    expect(result).toEqual(mockData);
    expect(fs.writeFile).toHaveBeenCalledOnce();
  });

  it('читає дані з кешу якщо запис актуальний', async () => {
    const cachedData = { from: 'cache' };
    const url = 'http://api/cached';
    const key = Buffer.from(url).toString('base64');

    fs.readFile.mockResolvedValue(
      JSON.stringify({
        [key]: { data: cachedData, cachedAt: Date.now() },
      }),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchExternal(url);

    expect(result).toEqual(cachedData);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ігнорує прострочений кеш і робить новий запит', async () => {
    const url = 'http://api/stale';
    const key = Buffer.from(url).toString('base64');
    const freshData = { fresh: true };

    fs.readFile.mockResolvedValue(
      JSON.stringify({
        [key]: { data: { old: true }, cachedAt: Date.now() - 300_000 },
      }),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => freshData })),
    );

    const result = await fetchExternal(url);
    expect(result).toEqual(freshData);
  });

  it('повертає null і не кидає виняток якщо fetch падає після всіх retry', async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Connection refused');
      }),
    );

    const promise = fetchExternal('http://dead-server/api');
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('робить повторні спроби перед тим як здатися (retry logic)', async () => {
    vi.useFakeTimers();

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        callCount++;
        throw new Error('Temporary error');
      }),
    );

    const promise = fetchExternal('http://flaky/api');
    await vi.runAllTimersAsync();
    await promise;

    expect(callCount).toBe(3);
  });

  it('повертає дані якщо перші спроби провалились, але остання успішна', async () => {
    vi.useFakeTimers();

    let attempt = 0;
    const successData = { ok: true };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        attempt++;
        if (attempt < 3) throw new Error('Temporary');
        return { ok: true, json: async () => successData };
      }),
    );

    const promise = fetchExternal('http://eventually-ok/api');
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual(successData);
    expect(attempt).toBe(3);
  });
});
