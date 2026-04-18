// ---------------- QUERY ----------------
export const githubQuerySchema = {
  type: 'object',
  required: ['repo'],
  properties: {
    repo: {
      type: 'string',
      pattern: '^[\\w.-]+/[\\w.-]+$',
      description: 'Шлях до репозиторію у форматі owner/repo',
    },
  },
  additionalProperties: false,
};

// ---------------- REPO ITEM ----------------
const sharedRepoItem = {
  type: 'object',
  properties: {
    rank: { type: 'number' },
    repo: { type: 'string' },
    url: { type: 'string' },
    sharedContributors: { type: 'number' },
    stars: { type: 'number' },
    description: { type: ['string', 'null'] },
  },
};

// ---------------- RESPONSE ----------------
export const githubResponseSchema = {
  type: 'object',
  properties: {
    sourceRepo: { type: 'string' },
    totalContributorsAnalyzed: { type: 'number' },
    top5: {
      type: 'array',
      items: sharedRepoItem,
    },
    meta: {
      type: 'object',
      properties: {
        apiVersion: { type: 'string' },
        durationMs: { type: 'number' },
      },
    },
  },
};
