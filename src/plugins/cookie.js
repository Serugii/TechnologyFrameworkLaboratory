import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';

async function cookiePlugin(fastify) {
  await fastify.register(fastifyCookie);
}

export default fp(cookiePlugin);
