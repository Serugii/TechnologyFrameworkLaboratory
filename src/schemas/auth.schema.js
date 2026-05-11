// ---------------- USER FIELDS ----------------
const authFields = {
  email: { type: 'string', format: 'email', maxLength: 255 },
  password: { type: 'string', minLength: 6 },
};

// ---------------- BODY ----------------
export const registerBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: authFields,
  additionalProperties: false,
};

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: authFields,
  additionalProperties: false,
};

// ---------------- RESPONSE ----------------
export const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    email: { type: 'string' },
  },
};

export const authResponseSchema = {
  type: 'object',
  required: ['message', 'user'],
  properties: {
    message: { type: 'string' },
    user: userResponseSchema,
  },
};

export const meResponseSchema = {
  type: 'object',
  required: ['user'],
  properties: {
    user: userResponseSchema,
  },
};
