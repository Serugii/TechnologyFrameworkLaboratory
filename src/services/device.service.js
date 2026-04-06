import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import * as repository from '#repositories';
import fs from 'fs/promises';
import path from 'path';
import { buildImageUrl } from '#utils/url.utils.js';

export async function importDevices(buffer, filename, mimetype, validate) {
  let items = [];

  // ---------------- PARSE ----------------
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

  // ---------------- VALIDATION ----------------
  const result = {
    imported: 0,
    failed: 0,
    errors: [],
  };

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
      result.errors.push({
        index: i + 1,
        reason: 'Save failed',
      });
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
  const device = await repository.create(data);
  return device;
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

export async function exportDevices(baseUrl) {
  const devices = await repository.findAll();

  const data = devices.map((d) => ({
    ...d,
    image: buildImageUrl(baseUrl, d.image),
  }));

  const csv = stringify(data, {
    header: true,
    delimiter: ';',
  });

  return csv;
}

export async function getDeviceById(id) {
  return repository.findById(id);
}

export async function saveDeviceImage(id, file, buffer) {
  const uploadDir = path.join(process.cwd(), 'uploads', String(id));

  await fs.mkdir(uploadDir, { recursive: true });

  const extension = file.mimetype === 'image/png' ? 'png' : 'jpg';
  const filename = `image.${extension}`;

  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, buffer);

  const relativePath = `/${id}/${filename}`;

  const device = await repository.update(id, {
    image: relativePath,
  });

  return device;
}
