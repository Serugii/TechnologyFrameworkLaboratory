import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setRepository,
  createDevice,
  updateDevice,
  deleteDevice,
  listDevices,
  importDevices,
  listDevicesPaginated,
  buildImageUrl,
} from '../../services/device.service.js';

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
});

describe('createDevice', () => {
  it('створює пристрій і повертає результат репозиторія', async () => {
    const repo = makeRepo({
      create: vi.fn(async (data) => ({ id: 10, ...data })),
    });
    setRepository(repo);

    const result = await createDevice({ device: 'lamp', room: 'hall' });
    expect(result).toMatchObject({ id: 10, device: 'lamp', room: 'hall' });
    expect(repo.create).toHaveBeenCalledWith({ device: 'lamp', room: 'hall' });
  });
});

describe('updateDevice', () => {
  it('успішно оновлює пристрій', async () => {
    const repo = makeRepo({
      update: vi.fn(async (id, data) => ({ id, ...data })),
    });
    setRepository(repo);

    const result = await updateDevice(1, { status: 'off' });
    expect(result).toMatchObject({ id: 1, status: 'off' });
  });

  it('кидає 400, якщо намагаються оновити поле id', async () => {
    setRepository(makeRepo());
    await expect(updateDevice(1, { id: 99 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('кидає 404, якщо пристрій не знайдено', async () => {
    setRepository(makeRepo({ update: vi.fn(async () => null) }));
    await expect(updateDevice(999, { status: 'on' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('deleteDevice', () => {
  it('успішно видаляє пристрій', async () => {
    setRepository(makeRepo({ remove: vi.fn(async () => true) }));
    await expect(deleteDevice(1)).resolves.toBeUndefined();
  });

  it('кидає 404, якщо пристрій не знайдено', async () => {
    setRepository(makeRepo({ remove: vi.fn(async () => false) }));
    await expect(deleteDevice(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('listDevices', () => {
  it('повертає список пристроїв', async () => {
    const devices = [{ id: 1, device: 'lamp', room: 'kitchen' }];
    setRepository(makeRepo({ findAll: vi.fn(async () => devices) }));

    const result = await listDevices();
    expect(result).toEqual(devices);
  });

  it('передає фільтри room та status у репозиторій', async () => {
    const repo = makeRepo({ findAll: vi.fn(async () => []) });
    setRepository(repo);

    await listDevices('bedroom', 'on');
    expect(repo.findAll).toHaveBeenCalledWith({
      room: 'bedroom',
      status: 'on',
    });
  });
});

describe('listDevicesPaginated', () => {
  it('повертає правильну структуру пагінації', async () => {
    setRepository(
      makeRepo({
        findPaginated: vi.fn(async () => ({
          items: [{ id: 1 }],
          total: 10,
        })),
      }),
    );

    const result = await listDevicesPaginated(2, 5);
    expect(result.meta).toEqual({
      total: 10,
      page: 2,
      limit: 5,
      totalPages: 2,
    });
    expect(result.data).toHaveLength(1);
  });

  it('використовує значення за замовчуванням page=1, limit=5', async () => {
    const repo = makeRepo({
      findPaginated: vi.fn(async () => ({ items: [], total: 0 })),
    });
    setRepository(repo);

    await listDevicesPaginated();
    expect(repo.findPaginated).toHaveBeenCalledWith(0, 5);
  });

  it('обчислює totalPages з округленням вгору', async () => {
    setRepository(
      makeRepo({
        findPaginated: vi.fn(async () => ({ items: [], total: 11 })),
      }),
    );
    const result = await listDevicesPaginated(1, 5);
    expect(result.meta.totalPages).toBe(3);
  });
});

describe('importDevices', () => {
  const validate = Object.assign((item) => !!item.device && !!item.room, {
    errors: [{ message: 'missing required field' }],
  });

  it('імпортує валідні JSON пристрої', async () => {
    const repo = makeRepo({ create: vi.fn(async (d) => d) });
    setRepository(repo);

    const buffer = Buffer.from(
      JSON.stringify([{ device: 'lamp', room: 'hall' }]),
    );
    const result = await importDevices(
      buffer,
      'devices.json',
      'application/json',
      validate,
    );

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('рахує невалідні записи у failed', async () => {
    setRepository(makeRepo());

    const buffer = Buffer.from(JSON.stringify([{ device: '', room: '' }]));
    const result = await importDevices(
      buffer,
      'devices.json',
      'application/json',
      validate,
    );

    expect(result.failed).toBe(1);
    expect(result.errors[0]).toHaveProperty('index', 1);
  });

  it('кидає 400 на невалідний JSON', async () => {
    setRepository(makeRepo());

    await expect(
      importDevices(
        Buffer.from('not-json'),
        'file.json',
        'application/json',
        validate,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('кидає 400 на непідтримуваний формат файлу', async () => {
    setRepository(makeRepo());

    await expect(
      importDevices(
        Buffer.from('data'),
        'file.xml',
        'application/xml',
        validate,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('імпортує CSV файл (semicolon-separated)', async () => {
    const repo = makeRepo({ create: vi.fn(async (d) => d) });
    setRepository(repo);

    const csv = 'device;room\nlamp;kitchen';
    const result = await importDevices(
      Buffer.from(csv),
      'devices.csv',
      'text/csv',
      validate,
    );

    expect(result.imported).toBe(1);
  });

  it('фіксує помилку, якщо create кидає виняток', async () => {
    const repo = makeRepo({
      create: vi.fn(async () => {
        throw new Error('DB error');
      }),
    });
    setRepository(repo);

    const buffer = Buffer.from(
      JSON.stringify([{ device: 'lamp', room: 'hall' }]),
    );
    const result = await importDevices(
      buffer,
      'f.json',
      'application/json',
      validate,
    );

    expect(result.failed).toBe(1);
    expect(result.errors[0].reason).toBe('Save failed');
  });
});
