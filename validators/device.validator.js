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

const createDeviceValidator = ajv.compile(createDeviceSchema);
const updateDeviceValidator = ajv.compile(updateDeviceSchema);

function validate(validator, data) {
  const valid = validator(data);

  if (!valid) {
    const errors = validator.errors
      .map((e) => {
        const field = e.instancePath || e.params?.missingProperty || 'field';
        return `${field} ${e.message}`;
      })
      .join(', ');

    const error = new Error(`Validation error: ${errors}`);
    error.statusCode = 400;
    throw error;
  }

  return true;
}

module.exports = {
  createDeviceValidator,
  updateDeviceValidator,
  validate,
};
