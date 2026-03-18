const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: true });

const createDeviceSchema = {
  type: 'object',
  properties: {
    device: { type: 'string', minLength: 1, maxLength: 50 },
    room: { type: 'string', minLength: 1, maxLength: 30 },
    status: { type: 'string', enum: ['on', 'off'] },
  },
  required: ['device', 'room'],
  additionalProperties: false,
};

const updateDeviceSchema = {
  type: 'object',
  properties: {
    device: { type: 'string', minLength: 1, maxLength: 50 },
    room: { type: 'string', minLength: 1, maxLength: 30 },
    status: { type: 'string', enum: ['on', 'off'] },
  },
  additionalProperties: false,
};

function validate(schema, data) {
  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);

  if (!valid) {
    const errors = validateFn.errors
      .map((e) => `${e.instancePath} ${e.message}`)
      .join(', ');
    const error = new Error(`Validation error: ${errors}`);
    error.statusCode = 400;
    throw error;
  }
  return true;
}

module.exports = {
  createDeviceSchema,
  updateDeviceSchema,
  validate,
};
