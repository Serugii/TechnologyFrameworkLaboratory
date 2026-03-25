export const deviceBodySchema = {
  type: 'object',
  required: ['device', 'room'],
  properties: {
    device: { type: 'string', minLength: 1, maxLength: 50 },
    room: { type: 'string', minLength: 1, maxLength: 30 },
    status: { type: 'string', enum: ['on', 'off'] },
  },
  additionalProperties: false,
};

export const deviceUpdateSchema = {
  type: 'object',
  properties: {
    device: { type: 'string', minLength: 1, maxLength: 50 },
    room: { type: 'string', minLength: 1, maxLength: 30 },
    status: { type: 'string', enum: ['on', 'off'] },
  },
  additionalProperties: false,
};

export const deviceResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    device: { type: 'string' },
    room: { type: 'string' },
    status: { type: 'string' },
  },
};
