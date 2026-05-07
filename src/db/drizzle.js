import fp from 'fastify-plugin';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema.js';
import { createRepository } from '#repositories';
import { setRepository } from '#services';

async function drizzlePlugin(fastify) {
  const db = drizzle(fastify.mysql, { schema, mode: 'default' });

  fastify.decorate('db', db);

  const repository = createRepository(db);
  fastify.decorate('repository', repository);
  setRepository(repository);

  fastify.log.info('Drizzle ORM initialized');
}

export default fp(drizzlePlugin);
