// ---------------- BODY ----------------
export const registerBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: 8, maxLength: 72 },
  },
  additionalProperties: false,
};

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

// ---------------- RESPONSE ----------------
export const registerResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    email: { type: 'string' },
  },
};

export const loginResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
  },
};

export const refreshResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
  },
};

// ---------------- SWAGGER HELPERS ----------------
export const bearerSecurity = [{ bearerAuth: [] }];

export const authorizationHeaderSchema = {
  type: 'object',
  required: ['authorization'],
  properties: {
    authorization: {
      type: 'string',
      description: 'Bearer <access_token>',
    },
  },
};
