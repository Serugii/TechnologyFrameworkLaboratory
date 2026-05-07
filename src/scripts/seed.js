import mysql from 'mysql2/promise';
import { createItemModel } from '#models';
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
    if (force) {
      await pool.query('TRUNCATE TABLE devices');
      console.log('Table cleared (force mode)');
    } else {
      const [[{ count }]] = await pool.query(
        'SELECT COUNT(*) as count FROM devices',
      );
      if (count > 0) {
        console.log(
          `Table already has ${count} row(s). Use seed:force to override.`,
        );
        return;
      }
    }

    for (const device of DEVICES) {
      const model = createItemModel(device);
      await pool.query(
        `INSERT INTO devices (device, room, status, description, image)
         VALUES (?, ?, ?, ?, ?)`,
        [
          model.device,
          model.room,
          model.status,
          model.description,
          model.image,
        ],
      );
    }

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
