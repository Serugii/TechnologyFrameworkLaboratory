import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';

const SCHEMA_FILE = path.resolve('src/db/schema.sql');

const migrate = async () => {
  const pool = mysql.createPool({
    /* eslint-disable no-restricted-properties */
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    /* eslint-enable no-restricted-properties */
  });

  try {
    const content = await fs.readFile(SCHEMA_FILE, 'utf8');
    const currentHash = crypto.createHash('md5').update(content).digest('hex');

    const [rows] = await pool.query(
      'SELECT schema_hash FROM migrations ORDER BY id DESC LIMIT 1',
    );

    if (rows.length > 0 && rows[0].schema_hash === currentHash) {
      console.log('Schema is up to date. No migration needed.');
      return;
    }

    await pool.query('INSERT INTO migrations (schema_hash) VALUES (?)', [
      currentHash,
    ]);

    console.log('Migration applied. New schema hash saved:', currentHash);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

migrate();
