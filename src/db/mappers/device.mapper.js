export const mapDevice = (device) => ({
  id: device._id.toString(),
  device: device.device,
  room: device.room,
  status: device.status,
  description: device.description,
  image: device.image,
  createdAt: device.createdAt,
  updatedAt: device.updatedAt,
});
