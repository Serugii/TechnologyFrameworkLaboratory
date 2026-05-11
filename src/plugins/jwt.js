import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { REDIS_KEYS } from '#constants/redis';

async function jwtPlugin(fastify) {
  await fastify.register(fastifyJwt, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      expiresIn: '15m',
    },
    trusted: async (request, decodedToken) => {
      const key = REDIS_KEYS.TOKEN_BLACKLIST(decodedToken.jti);
      const isBlacklisted = await fastify.redis.get(key);
      return !isBlacklisted;
    },
  });
}

export default fp(jwtPlugin);
