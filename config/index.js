function validateEnv() {
  const { PORT, HOSTNAME, NODE_ENV } = process.env;

  if (!PORT) {
    console.error('PORT is required');
    process.exit(1);
  }

  if (isNaN(PORT)) {
    console.error('PORT must be a number');
    process.exit(1);
  }

  if (!HOSTNAME) {
    console.error('HOSTNAME is required');
    process.exit(1);
  }

  if (!NODE_ENV) {
    console.error('NODE_ENV is required');
    process.exit(1);
  }

  if (!['development', 'production'].includes(NODE_ENV)) {
    console.error('NODE_ENV must be development or production');
    process.exit(1);
  }

  return {
    PORT: Number(PORT),
    HOSTNAME,
    NODE_ENV,
  };
}

const config = validateEnv();

export default config;
