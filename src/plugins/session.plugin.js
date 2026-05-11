import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import RedisStore from 'fastify-session-redis-store';

const SESSION_TTL_SECONDS = 24 * 60 * 60;

async function sessionPlugin(fastify) {
  await fastify.register(fastifyCookie);

  await fastify.register(fastifySession, {
    secret: fastify.config.SESSION_SECRET,
    cookie: {
      secure: fastify.config.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS * 1000,
      sameSite: 'lax',
    },
    store: new RedisStore({
      client: fastify.redis,
      ttl: SESSION_TTL_SECONDS,
    }),
    saveUninitialized: false,
  });

  fastify.log.info('Session plugin registered with Redis store');
}

export default fp(sessionPlugin);
