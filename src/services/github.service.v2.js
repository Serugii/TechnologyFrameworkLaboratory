/**
 * Відмінності від v1:
 * - Contributors отримуємо через GraphQL (mentionableUsers) — один запит замість REST пагінації
 * - Репо користувача отримуємо через GraphQL (repositoriesContributedTo) —
 *   це точніше ніж /users/{login}/repos, бо включає репо куди він робив PR/commit,
 *   навіть якщо він не власник
 * - Менше round-trips до API завдяки GraphQL batching
 */

const GITHUB_REST = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const MAX_CONTRIBUTORS = 100;
const TOP_N = 5;

function buildRestHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function buildGqlHeaders(token) {
  if (!token)
    throw {
      statusCode: 401,
      message: 'GraphQL API requires GITHUB_TOKEN in .env',
    };
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function gqlFetch(query, variables, token) {
  const res = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: buildGqlHeaders(token),
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401)
    throw { statusCode: 401, message: 'Invalid GITHUB_TOKEN' };
  if (!res.ok)
    throw {
      statusCode: res.status,
      message: `GitHub GraphQL error: ${res.statusText}`,
    };

  const json = await res.json();
  if (json.errors) {
    throw {
      statusCode: 422,
      message: json.errors[0]?.message ?? 'GraphQL error',
    };
  }
  return json.data;
}

async function restFetch(url, token) {
  const res = await fetch(url, { headers: buildRestHeaders(token) });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw {
      statusCode: 429,
      message: `GitHub rate limit exceeded. Resets at ${new Date(reset * 1000).toISOString()}`,
    };
  }
  if (!res.ok)
    throw {
      statusCode: res.status,
      message: `GitHub REST error: ${res.statusText}`,
    };
  return res.json();
}

const CONTRIBUTORS_QUERY = `
  query GetContributors($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      mentionableUsers(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { login }
      }
    }
  }
`;

async function getContributorsGql(owner, repo, token) {
  const logins = [];
  let cursor = null;

  while (logins.length < MAX_CONTRIBUTORS) {
    const data = await gqlFetch(
      CONTRIBUTORS_QUERY,
      { owner, repo, cursor },
      token,
    );

    const page = data?.repository?.mentionableUsers;
    if (!page) break;

    page.nodes.forEach((u) => logins.push(u.login));

    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }

  return logins.slice(0, MAX_CONTRIBUTORS);
}

function buildBatchReposQuery(logins) {
  const aliases = logins.map(
    (login, i) => `
    user${i}: user(login: "${login}") {
      repositoriesContributedTo(first: 50, includeUserRepositories: true, contributionTypes: [COMMIT, PULL_REQUEST]) {
        nodes { nameWithOwner }
      }
    }
  `,
  );
  return `query { ${aliases.join('\n')} }`;
}

async function getBatchUserReposGql(logins, token) {
  const query = buildBatchReposQuery(logins);
  const data = await gqlFetch(query, {}, token);

  const result = new Map();
  logins.forEach((login, i) => {
    const nodes = data?.[`user${i}`]?.repositoriesContributedTo?.nodes ?? [];
    result.set(
      login,
      nodes.map((n) => n.nameWithOwner),
    );
  });
  return result;
}

export async function findSharedReposV2(repoPath, token) {
  const [owner, repo] = repoPath.split('/');

  const contributors = await getContributorsGql(owner, repo, token);
  if (contributors.length === 0) {
    throw {
      statusCode: 404,
      message: `Repository "${repoPath}" not found or has no contributors`,
    };
  }

  const repoScores = new Map();
  const BATCH = 5;

  for (let i = 0; i < contributors.length; i += BATCH) {
    const batch = contributors.slice(i, i + BATCH);
    const userReposMap = await getBatchUserReposGql(batch, token);

    userReposMap.forEach((repos) => {
      repos.forEach((fullName) => {
        if (fullName.toLowerCase() === repoPath.toLowerCase()) return;
        repoScores.set(fullName, (repoScores.get(fullName) ?? 0) + 1);
      });
    });
  }

  const sorted = [...repoScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);

  const enriched = await Promise.all(
    sorted.map(async ([fullName, sharedCount], idx) => {
      const meta = await restFetch(`${GITHUB_REST}/repos/${fullName}`, token);
      return {
        rank: idx + 1,
        repo: fullName,
        url: meta?.html_url ?? `https://github.com/${fullName}`,
        sharedContributors: sharedCount,
        stars: meta?.stargazers_count ?? 0,
        description: meta?.description ?? null,
      };
    }),
  );

  return {
    sourceRepo: repoPath,
    totalContributorsAnalyzed: contributors.length,
    top5: enriched,
    meta: { apiVersion: 'v2 (REST + GraphQL)' },
  };
}
