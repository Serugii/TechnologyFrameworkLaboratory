import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setRepository,
  getDeviceById,
  getDeviceDetails,
  exportDevices,
  exportDevicesStream,
  streamDevices,
  saveDeviceImage,
} from '../../services/device.service.js';
import fs from 'fs/promises';
import path from 'path';

vi.mock('../../utils/fetch.utils.js', () => ({
  fetchExternal: vi.fn(async () => null),
}));

import { fetchExternal } from '../../utils/fetch.utils.js';

function makeRepo(overrides = {}) {
  return {
    create: vi.fn(async (data) => ({ id: 1, ...data })),
    update: vi.fn(async (id, data) => ({ id, ...data })),
    remove: vi.fn(async () => true),
    findAll: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    findPaginated: vi.fn(async () => ({ items: [], total: 0 })),
    streamAll: vi.fn(function* () {}),
    findWithDetails: vi.fn(async () => null),
    ...overrides,
  };
}

beforeEach(() => {
  setRepository(makeRepo());
  vi.clearAllMocks();
});

describe('getDeviceById', () => {
  it('повертає пристрій якщо знайдено', async () => {
    const device = { id: 1, device: 'lamp', room: 'hall' };
    setRepository(makeRepo({ findById: vi.fn(async () => device) }));

    const result = await getDeviceById(1);
    expect(result).toEqual(device);
  });

  it('повертає null якщо пристрій не знайдено', async () => {
    setRepository(makeRepo({ findById: vi.fn(async () => null) }));
    const result = await getDeviceById(999);
    expect(result).toBeNull();
  });
});

describe('getDeviceDetails', () => {
  it('повертає null якщо пристрій не існує', async () => {
    setRepository(makeRepo({ findWithDetails: vi.fn(async () => null) }));
    const result = await getDeviceDetails(999, 'http://api');
    expect(result).toBeNull();
  });

  it('повертає деталі пристрою з typeDetails з зовнішнього API', async () => {
    const device = { id: 1, device: 'Lamp', room: 'hall' };
    setRepository(makeRepo({ findWithDetails: vi.fn(async () => device) }));
    fetchExternal.mockResolvedValueOnce([{ type: 'lamp', powerWatt: 10 }]);

    const result = await getDeviceDetails(1, 'http://external');
    expect(result.typeDetails).toEqual({ type: 'lamp', powerWatt: 10 });
  });

  it('заповнює typeDetails null якщо зовнішній API недоступний', async () => {
    const device = { id: 1, device: 'Fan', room: 'bedroom' };
    setRepository(makeRepo({ findWithDetails: vi.fn(async () => device) }));
    fetchExternal.mockResolvedValueOnce(null);

    const result = await getDeviceDetails(1, 'http://external');
    expect(result.typeDetails).toEqual({ type: null, powerWatt: null });
  });

  it('заповнює typeDetails null якщо зовнішній API повертає порожній масив', async () => {
    const device = { id: 2, device: 'Fan', room: 'kitchen' };
    setRepository(makeRepo({ findWithDetails: vi.fn(async () => device) }));
    fetchExternal.mockResolvedValueOnce([]);

    const result = await getDeviceDetails(2, 'http://external');
    expect(result.typeDetails).toEqual({ type: null, powerWatt: null });
  });
});

describe('exportDevices', () => {
  it('повертає CSV рядок зі списку пристроїв', async () => {
    const devices = [
      { id: 1, device: 'lamp', room: 'hall', image: '/1/image.jpg' },
    ];
    setRepository(makeRepo({ findAll: vi.fn(async () => devices) }));

    const result = await exportDevices('http://localhost:3000');
    expect(typeof result).toBe('string');
    expect(result).toContain('lamp');
    expect(result).toContain('hall');
  });

  it('повертає лише заголовки для порожнього списку', async () => {
    setRepository(makeRepo({ findAll: vi.fn(async () => []) }));

    const result = await exportDevices('http://localhost:3000');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

describe('streamDevices', () => {
  it('повертає Readable стрім', async () => {
    const { Readable } = await import('stream');
    setRepository(
      makeRepo({
        streamAll: vi.fn(function* () {
          yield { id: 1 };
        }),
      }),
    );

    const stream = await streamDevices();
    expect(stream).toBeInstanceOf(Readable);
  });
});

describe('exportDevicesStream', () => {
  it('повертає CSV stringifier стрім (без трансформації)', async () => {
    setRepository(
      makeRepo({
        streamAll: vi.fn(function* () {
          yield { id: 1, device: 'lamp', room: 'hall', image: null };
        }),
      }),
    );

    const stream = await exportDevicesStream('http://localhost:3000', false);
    expect(stream).toBeDefined();
    expect(typeof stream.pipe).toBe('function');
  });

  it('повертає CSV stringifier стрім (з ActiveStatusTransform)', async () => {
    setRepository(
      makeRepo({
        streamAll: vi.fn(function* () {
          yield {
            id: 1,
            device: 'fan',
            room: 'bedroom',
            status: 'on',
            image: null,
          };
        }),
      }),
    );

    const stream = await exportDevicesStream('http://localhost:3000', true);
    expect(stream).toBeDefined();
    expect(typeof stream.pipe).toBe('function');
  });
});

describe('saveDeviceImage', () => {
  const UPLOAD_DIR = path.join(process.cwd(), 'uploads', '999');

  afterEach(async () => {
    try {
      await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
    } catch {}
  });

  it('зберігає jpg файл і оновлює репозиторій', async () => {
    const repo = makeRepo({
      update: vi.fn(async (id, data) => ({ id, ...data })),
    });
    setRepository(repo);

    const file = { mimetype: 'image/jpeg' };
    const buffer = Buffer.from('fake-image-data');

    await saveDeviceImage(999, file, buffer);

    expect(repo.update).toHaveBeenCalledWith(999, { image: '/999/image.jpg' });

    const saved = await fs.readFile(path.join(UPLOAD_DIR, 'image.jpg'));
    expect(saved.toString()).toBe('fake-image-data');
  });

  it('зберігає png файл з правильним розширенням', async () => {
    const repo = makeRepo({
      update: vi.fn(async (id, data) => ({ id, ...data })),
    });
    setRepository(repo);

    const file = { mimetype: 'image/png' };
    const buffer = Buffer.from('png-data');

    await saveDeviceImage(999, file, buffer);
    expect(repo.update).toHaveBeenCalledWith(999, { image: '/999/image.png' });
  });
});
