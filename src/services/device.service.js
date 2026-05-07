import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse/sync';
import * as repository from '../repositories/device.repository.js';
import path from 'path';
import { Readable, Transform } from 'stream';
import { buildImageUrl } from '#utils/url.utils.js';
import { fetchExternal } from '#utils/fetch.utils.js';
import { ActiveStatusTransform } from '../transforms/activeStatus.transform.js';

export async function importDevices(buffer, filename, mimetype, validate) {
  let items = [];

  if (mimetype === 'application/json' || filename.endsWith('.json')) {
    try {
      items = JSON.parse(buffer.toString());
    } catch (e) {
      throw { statusCode: 400, message: 'Invalid JSON file' };
    }
  } else if (mimetype === 'text/csv' || filename.endsWith('.csv')) {
    items = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
    });
  } else {
    throw { statusCode: 400, message: 'Unsupported file format' };
  }

  const result = { imported: 0, failed: 0, errors: [] };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isValid = validate(item);

    if (!isValid) {
      result.failed++;
      result.errors.push({
        index: i + 1,
        reason: validate.errors?.[0]?.message || 'Validation failed',
      });
      continue;
    }

    try {
      await repository.create(item);
      result.imported++;
    } catch (e) {
      result.failed++;
      result.errors.push({ index: i + 1, reason: 'Save failed' });
    }
  }

  return result;
}

export async function listDevices(room) {
  let devices = await repository.findAll();
  if (room) {
    devices = devices.filter(
      (d) => d.room.toLowerCase() === room.toLowerCase(),
    );
  }
  return devices;
}

export async function createDevice(data) {
  return repository.create(data);
}

export async function updateDevice(id, updates) {
  if (updates.id) {
    throw { statusCode: 400, message: 'Cannot update id field' };
  }
  const device = await repository.update(id, updates);
  if (!device) {
    throw { statusCode: 404, message: 'Device not found' };
  }
  return device;
}

export async function deleteDevice(id) {
  const success = await repository.remove(id);
  if (!success) {
    throw { statusCode: 404, message: 'Device not found' };
  }
}

// ---------------- EXPORT (старий, без стрімінгу) ----------------
export async function exportDevices(baseUrl) {
  const devices = await repository.findAll();
  const data = devices.map((d) => ({
    ...d,
    image: buildImageUrl(baseUrl, d.image),
  }));
  const { stringify: stringifySync } = await import('csv-stringify/sync');
  return stringifySync(data, { header: true, delimiter: ';' });
}

// ---------------- EXPORT STREAM ----------------
export async function exportDevicesStream(baseUrl, withTransform) {
  const source = repository.streamAll();

  const enrichStream = new Transform({
    objectMode: true,
    transform(chunk, _, callback) {
      callback(null, {
        ...chunk,
        image: buildImageUrl(baseUrl, chunk.image),
      });
    },
  });

  const csvStringifier = stringify({
    header: true,
    delimiter: ';',
  });

  let stream = source.pipe(enrichStream);

  if (withTransform) {
    stream = stream.pipe(new ActiveStatusTransform());
  }

  return stream.pipe(csvStringifier);
}

// ---------------- STREAM NDJSON ----------------
export async function streamDevices() {
  return Readable.from(repository.streamAll());
}

export async function getDeviceById(id) {
  return repository.findById(id);
}

export async function getDeviceDetails(id, externalBaseUrl) {
  const device = await repository.findWithDetails(id);
  if (!device) return null;

  const deviceTypeName = device.device?.toLowerCase();
  const url = `${externalBaseUrl}/deviceTypes?type=${deviceTypeName}`;
  const externalResults = await fetchExternal(url);

  const typeInfo =
    Array.isArray(externalResults) && externalResults.length > 0
      ? externalResults[0]
      : null;

  return {
    ...device,
    typeDetails: {
      type: typeInfo?.type ?? null,
      powerWatt: typeInfo?.powerWatt ?? null,
    },
  };
}

export async function saveDeviceImage(id, file, buffer) {
  const uploadDir = path.join(process.cwd(), 'uploads', String(id));
  await fs.mkdir(uploadDir, { recursive: true });

  const extension = file.mimetype === 'image/png' ? 'png' : 'jpg';
  const filename = `image.${extension}`;
  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, buffer);

  const relativePath = `/${id}/${filename}`;
  return repository.update(id, { image: relativePath });
}

export async function listDevicesPaginated(page = 1, limit = 5) {
  const offset = (page - 1) * limit;
  const { items, total } = await repository.findPaginated(offset, limit);
  const totalPages = Math.ceil(total / limit);
  return { data: items, meta: { total, page, limit, totalPages } };
}
