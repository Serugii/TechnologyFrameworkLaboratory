import { describe, it, expect } from 'vitest';
import { ActiveStatusTransform } from '../../transforms/activeStatus.transform.js';
import { NdjsonTransform } from '../../transforms/ndjson.transform.js';
import { Readable } from 'stream';

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(chunks));
    stream.on('error', reject);
  });
}

describe('ActiveStatusTransform', () => {
  it('додає isActive=true коли status="on"', async () => {
    const transform = new ActiveStatusTransform();
    const source = Readable.from([{ id: 1, status: 'on', room: 'hall' }]);
    source.pipe(transform);

    const results = await collectStream(transform);
    expect(results[0]).toMatchObject({ isActive: true, status: 'on' });
  });

  it('додає isActive=false коли status="off"', async () => {
    const transform = new ActiveStatusTransform();
    const source = Readable.from([{ id: 2, status: 'off' }]);
    source.pipe(transform);

    const results = await collectStream(transform);
    expect(results[0].isActive).toBe(false);
  });

  it("зберігає всі оригінальні поля об'єкта", async () => {
    const transform = new ActiveStatusTransform();
    const device = { id: 3, status: 'on', device: 'fan', room: 'bedroom' };
    const source = Readable.from([device]);
    source.pipe(transform);

    const results = await collectStream(transform);
    expect(results[0]).toMatchObject(device);
    expect(results[0]).toHaveProperty('isActive');
  });

  it("коректно обробляє декілька об'єктів", async () => {
    const transform = new ActiveStatusTransform();
    const devices = [
      { id: 1, status: 'on' },
      { id: 2, status: 'off' },
      { id: 3, status: 'on' },
    ];
    const source = Readable.from(devices);
    source.pipe(transform);

    const results = await collectStream(transform);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.isActive)).toEqual([true, false, true]);
  });
});

describe('NdjsonTransform', () => {
  it("серіалізує об'єкт у NDJSON рядок", async () => {
    const transform = new NdjsonTransform();
    const source = Readable.from([{ id: 1, name: 'lamp' }]);
    source.pipe(transform);

    const chunks = await collectStream(transform);
    const line = chunks.join('');
    expect(line).toBe('{"id":1,"name":"lamp"}\n');
  });

  it('кожен рядок закінчується символом нового рядка', async () => {
    const transform = new NdjsonTransform();
    const source = Readable.from([{ a: 1 }, { b: 2 }]);
    source.pipe(transform);

    const chunks = await collectStream(transform);
    const output = chunks.join('');
    const lines = output.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it('результат є валідним JSON для кожного рядка', async () => {
    const transform = new NdjsonTransform();
    const obj = { id: 42, device: 'thermostat', room: 'living' };
    const source = Readable.from([obj]);
    source.pipe(transform);

    const chunks = await collectStream(transform);
    const parsed = JSON.parse(chunks.join('').trim());
    expect(parsed).toEqual(obj);
  });
});
