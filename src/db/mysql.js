import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';
import { createRepository } from '#repositories';
import { setRepository } from '#services';

async function mysqlPlugin(fastify) {
  const pool = mysql.createPool({
    host: fastify.config.MYSQL_HOST,
    port: fastify.config.MYSQL_PORT,
    user: fastify.config.MYSQL_USER,
    password: fastify.config.MYSQL_PASSWORD,
    database: fastify.config.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    const connection = await pool.getConnection();
    connection.release();
    fastify.log.info('MySQL connected');
  } catch (err) {
    fastify.log.error('MySQL connection failed: ' + err.message);
    process.exit(1);
  }

  fastify.decorate('mysql', pool);
  fastify.decorate('repository', createRepository(pool));
  setRepository(createRepository(pool));
  fastify.addHook('onClose', async () => {
    await pool.end();
    fastify.log.info('MySQL pool closed');
  });
}

export default fp(mysqlPlugin);
