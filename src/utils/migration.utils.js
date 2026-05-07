import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const SCHEMA_FILE = path.resolve('src/db/schema.sql');

const getSchemaHash = async () => {
  const content = await fs.readFile(SCHEMA_FILE, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
};

export const checkMigrationNeeded = async (fastify) => {
  try {
    const currentHash = await getSchemaHash();

    const [rows] = await fastify.mysql.query(
      'SELECT schema_hash FROM migrations ORDER BY id DESC LIMIT 1',
    );

    if (rows.length === 0) {
      await fastify.mysql.query(
        'INSERT INTO migrations (schema_hash) VALUES (?)',
        [currentHash],
      );
      fastify.log.info('Migration initialized. Schema hash saved.');
      return;
    }

    const savedHash = rows[0].schema_hash;

    if (savedHash !== currentHash) {
      fastify.log.warn(
        'DB schema changed. Run "npm run migrate" to apply changes.',
      );
    } else {
      fastify.log.info('DB schema is up to date.');
    }
  } catch (err) {
    fastify.log.error('Migration check failed: ' + err.message);
  }
};
