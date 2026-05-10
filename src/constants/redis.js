export const REDIS_KEYS = {
  DEVICES_ALL: 'devices:all',
  DEVICE_BY_ID: (id) => `device:${id}`,
  GITHUB_SHARED_REPOS: (repo, version) =>
    `github:shared-repos:${version}:${repo}`,
  DEVICES_PAGINATED: (page, limit) =>
    `devices:paginated:page=${page}:limit=${limit}`,
  DEVICES_PAGINATED_PATTERN: 'devices:paginated:*',
};

export const REDIS_TTL = {
  GITHUB_CACHE: 120,
  DEVICES_PAGINATED: 86400,
};
