import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connection = await mysql.createConnection({
  /* eslint-disable no-restricted-properties */
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  /* eslint-enable no-restricted-properties */
});

const db = drizzle(connection);

console.log('Running migrations...');

await migrate(db, {
  migrationsFolder: path.join(__dirname, '../db/migrations'),
});

console.log('Migrations complete!');

await connection.end();
