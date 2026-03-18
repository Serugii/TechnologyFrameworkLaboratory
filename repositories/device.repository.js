let DEVICES = [{ id: 1, device: 'Smart Lamp', status: 'on', room: 'Kitchen' }];

export function getAll() {
  return [...DEVICES];
}

export function getById(id) {
  return DEVICES.find((d) => d.id === id);
}

export function add(device) {
  DEVICES.push(device);
  return device;
}

export function update(id, updates) {
  const index = DEVICES.findIndex((d) => d.id === id);
  if (index === -1) return null;
  DEVICES[index] = { ...DEVICES[index], ...updates };
  return DEVICES[index];
}

export function remove(id) {
  const originalLength = DEVICES.length;
  DEVICES = DEVICES.filter((d) => d.id !== id);
  return DEVICES.length < originalLength;
}
