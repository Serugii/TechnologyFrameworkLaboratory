export const REDIS_KEYS = {
  DEVICES_ALL: 'devices:all',
  DEVICE_BY_ID: (id) => `device:${id}`,
  GITHUB_SHARED_REPOS: (repo, version) =>
    `github:shared-repos:${version}:${repo}`,
  DEVICES_PAGINATED: (page, limit) =>
    `devices:paginated:page=${page}:limit=${limit}`,
  DEVICES_PAGINATED_PATTERN: 'devices:paginated:*',

  TOKEN_BLACKLIST: (jti) => `auth:blacklist:${jti}`,
  REFRESH_TOKEN: (userId) => `auth:refresh:${userId}`,
};

export const REDIS_TTL = {
  GITHUB_CACHE: 120,
  DEVICES_PAGINATED: 86400,

  ACCESS_TOKEN: 15 * 60,
  REFRESH_TOKEN: 7 * 24 * 60 * 60,
};
