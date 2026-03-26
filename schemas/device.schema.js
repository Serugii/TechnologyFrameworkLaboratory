const deviceFields = {
  device: { type: 'string', minLength: 1, maxLength: 50 },
  room: { type: 'string', minLength: 1, maxLength: 30 },
  status: { type: 'string', enum: ['on', 'off'] },
};

// ---------------- BODY ----------------
export const deviceBodySchema = {
  type: 'object',
  required: ['device', 'room'],
  properties: deviceFields,
  additionalProperties: false,
};

export const deviceUpdateSchema = {
  type: 'object',
  properties: deviceFields,
  additionalProperties: false,
};

// ---------------- RESPONSE ----------------
export const deviceResponseSchema = {
  type: 'object',
  required: ['id', 'device', 'room', 'status'],
  properties: {
    id: { type: 'number' },
    ...deviceFields,
  },
};

// ---------------- PARAMS ----------------
export const deviceParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'number' },
  },
};

// ---------------- QUERY ----------------
export const deviceQuerySchema = {
  type: 'object',
  properties: {
    room: { type: 'string' },
    status: { type: 'string', enum: ['on', 'off'] },
  },
  additionalProperties: false,
};

// ---------------- RESPONSE WRAPPERS ----------------
const withMessage = (extraProps) => ({
  type: 'object',
  required: ['message', ...Object.keys(extraProps)],
  properties: {
    message: { type: 'string' },
    ...extraProps,
  },
});

export const deviceCreateResponseSchema = withMessage({
  device: deviceResponseSchema,
});

export const devicePatchResponseSchema = withMessage({
  device: deviceResponseSchema,
});

export const deviceDeleteResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string' },
  },
};

// ---------------- ENV ----------------
export const envSchema = {
  type: 'object',
  required: ['PORT', 'HOSTNAME', 'NODE_ENV', 'ADMIN_API_KEY'],
  properties: {
    PORT: { type: 'number' },
    HOSTNAME: { type: 'string' },
    NODE_ENV: { type: 'string', enum: ['development', 'production'] },
    ADMIN_API_KEY: { type: 'string' },
  },
};
