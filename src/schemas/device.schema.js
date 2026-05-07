const deviceFields = {
  device: { type: 'string', minLength: 1, maxLength: 50 },
  room: { type: 'string', minLength: 1, maxLength: 30 },
  status: { type: 'string', enum: ['on', 'off'] },
  description: { type: 'string', maxLength: 255 },
  image: {
    anyOf: [{ type: 'string' }, { type: 'null' }],
  },
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
  required: [
    'id',
    'device',
    'room',
    'status',
    'description',
    'image',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string' },
    ...deviceFields,
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

// ---------------- PARAMS ----------------
export const deviceParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
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
  required: [
    'PORT',
    'HOSTNAME',
    'NODE_ENV',
    'ADMIN_API_KEY',
    'MONGO_URL',
    'MONGO_DB_NAME',
  ],
  properties: {
    PORT: { type: 'number' },
    HOSTNAME: { type: 'string' },
    NODE_ENV: { type: 'string', enum: ['development', 'production'] },
    ADMIN_API_KEY: { type: 'string' },
    GITHUB_TOKEN: { type: 'string', default: '' },
    MONGO_URL: { type: 'string', minLength: 1 },
    MONGO_DB_NAME: { type: 'string', minLength: 1 },
  },
};

export const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 5 },
  },
  additionalProperties: false,
};

// ---------------- BACKUP ----------------
export const backupParamsSchema = {
  type: 'object',
  required: ['timestamp'],
  properties: {
    timestamp: { type: 'string', pattern: '^[0-9]+$' },
  },
};

export const backupHeadersSchema = {
  type: 'object',
  required: ['x-api-key'],
  properties: {
    'x-api-key': { type: 'string' },
  },
};

export const backupResponseSchema = {
  200: {
    type: 'string',
    format: 'binary',
    description: 'Gzip-стиснений файл бекапу',
  },
  401: {
    type: 'object',
    properties: { message: { type: 'string' } },
  },
  404: {
    type: 'object',
    properties: { message: { type: 'string' } },
  },
};

// ---------------- PAGINATION RESPONSE ----------------
export const paginatedDevicesResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: deviceResponseSchema,
    },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  },
};
