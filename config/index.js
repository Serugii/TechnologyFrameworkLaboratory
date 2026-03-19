import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });

const envSchema = {
  type: 'object',
  properties: {
    PORT: { type: 'string', pattern: '^[0-9]+$' },
    HOSTNAME: { type: 'string', minLength: 1 },
    NODE_ENV: { type: 'string', enum: ['development', 'production'] },
  },
  required: ['PORT', 'HOSTNAME', 'NODE_ENV'],
  additionalProperties: true,
};

const validateEnvSchema = ajv.compile(envSchema);

function validateEnv() {
  const env = {
    PORT: process.env.PORT,
    HOSTNAME: process.env.HOSTNAME,
    NODE_ENV: process.env.NODE_ENV,
  };

  const valid = validateEnvSchema(env);

  if (!valid) {
    const errors = validateEnvSchema.errors
      .map((e) => {
        const field = e.instancePath || e.params?.missingProperty || 'field';
        return `${field} ${e.message}`;
      })
      .join(', ');

    console.error(`Config validation error: ${errors}`);
    process.exit(1);
  }

  return {
    PORT: Number(env.PORT),
    HOSTNAME: env.HOSTNAME,
    NODE_ENV: env.NODE_ENV,
  };
}

const config = validateEnv();

export default config;
