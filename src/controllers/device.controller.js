import * as service from '#services';
import { deviceBodySchema } from '#schemas';

export async function getDevices(req, res, query) {
  const devices = await service.listDevices(query.room);
  res.statusCode = 200;
  return { count: devices.length, items: devices };
}

export async function postDevice(req, res, body) {
  const device = await service.createDevice(body);
  res.statusCode = 201;
  return { message: 'Created', device };
}

export async function patchDevice(req, res, id, body) {
  const device = await service.updateDevice(id, body);
  res.statusCode = 200;
  return { message: 'Updated', device };
}

export async function deleteDevice(req, res, id) {
  await service.deleteDevice(id);
  res.statusCode = 200;
  return { message: 'Deleted' };
}

export async function exportDevices(req, res) {
  const baseUrl = `${req.protocol}://${req.headers.host}`;

  const csv = await service.exportDevices(baseUrl);

  res.statusCode = 200;
  res.header('Content-Disposition', 'attachment; filename="items.csv"');
  res.header('Content-Type', 'text/csv');

  return csv;
}

export async function importDevices(req, res) {
  const data = await req.file();
  if (!data) {
    throw { statusCode: 400, message: 'File is required' };
  }
  const buffer = await data.toBuffer();

  const validate = req.server.validatorCompiler({
    schema: deviceBodySchema,
  });

  const result = await service.importDevices(
    buffer,
    data.filename,
    data.mimetype,
    validate,
  );

  res.statusCode = 200;
  return result;
}

export async function uploadDeviceImage(req, res, id, file, buffer) {
  const device = await service.getDeviceById(id);

  if (!device) {
    throw { statusCode: 404, message: 'Device not found' };
  }

  const result = await service.saveDeviceImage(id, file, buffer);

  res.statusCode = 200;
  return { message: 'Image uploaded', image: result.image };
}
