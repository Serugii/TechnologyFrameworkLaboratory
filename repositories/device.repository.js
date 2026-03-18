let DEVICES = [{ id: 1, device: 'Smart Lamp', status: 'on', room: 'Kitchen' }];

function getAll() {
  return [...DEVICES];
}

function getById(id) {
  return DEVICES.find((d) => d.id === id);
}

function add(device) {
  DEVICES.push(device);
  return device;
}

function update(id, updates) {
  const index = DEVICES.findIndex((d) => d.id === id);
  if (index === -1) return null;
  DEVICES[index] = { ...DEVICES[index], ...updates };
  return DEVICES[index];
}

function remove(id) {
  const originalLength = DEVICES.length;
  DEVICES = DEVICES.filter((d) => d.id !== id);
  return DEVICES.length < originalLength;
}

module.exports = { getAll, getById, add, update, remove };
