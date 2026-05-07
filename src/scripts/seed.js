import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { createItemModel } from '#models';
import { devices } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

const DEVICES = [
  {
    device: 'Smart Lamp',
    status: 'on',
    room: 'Kitchen',
    description: 'Smart lighting for kitchen',
  },
  {
    device: 'Air Conditioner',
    status: 'off',
    room: 'Bedroom',
    description: 'Climate control unit',
  },
  {
    device: 'TV',
    status: 'on',
    room: 'Living Room',
    description: 'Smart television',
  },
];

const seed = async (force = false) => {
  /* eslint-disable no-restricted-properties */
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
  });
  /* eslint-enable no-restricted-properties */

  const db = drizzle(pool, { mode: 'default' });

  try {
    if (force) {
      await db.execute(sql`TRUNCATE TABLE devices`);
      console.log('Table cleared (force mode)');
    } else {
      const [{ total }] = await db
        .select({ total: sql`COUNT(*)`.mapWith(Number) })
        .from(devices);

      if (total > 0) {
        console.log(
          `Table already has ${total} row(s). Use seed:force to override.`,
        );
        return;
      }
    }

    const values = DEVICES.map((device) => {
      const model = createItemModel(device);
      return {
        device: model.device,
        room: model.room,
        status: model.status,
        description: model.description,
        image: model.image,
      };
    });

    await db.insert(devices).values(values);

    console.log(`Seeding completed! ${DEVICES.length} devices inserted.`);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

const force = process.argv.includes('--force');
seed(force);
