import { REDIS_KEYS, REDIS_TTL } from '../constants/redis.js';

// ---------------- ФАБРИЧНА ФУНКЦІЯ (Dependency Injection) ----------------
export function createDeviceServiceV2({ repository, redis }) {
  return {
    async listPaginated(page = 1, limit = 5) {
      const cacheKey = REDIS_KEYS.DEVICES_PAGINATED(page, limit);

      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached);
      }

      const offset = (page - 1) * limit;
      const { items, total } = await repository.findPaginated(offset, limit);
      const totalPages = Math.ceil(total / limit);

      const result = {
        data: items,
        meta: { total, page, limit, totalPages },
      };

      await redis.set(
        cacheKey,
        JSON.stringify(result),
        'EX',
        REDIS_TTL.DEVICES_PAGINATED,
      );

      return result;
    },

    async invalidatePaginatedCache() {
      const keys = await redis.keys(REDIS_KEYS.DEVICES_PAGINATED_PATTERN);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    },
  };
}
