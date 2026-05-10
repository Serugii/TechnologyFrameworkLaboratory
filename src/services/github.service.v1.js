/**
 * Алгоритм:
 * 1. GET /repos/{owner}/{repo}/contributors  — отримати contributors вхідного репо
 * 2. Для кожного contributor GET /users/{login}/repos — отримати його репозиторії
 * 3. Підрахувати перетин: скільки contributors з вхідного репо є в кожному іншому репо
 * 4. Повернути топ-5
 */

import { REDIS_KEYS, REDIS_TTL } from '../constants/redis.js';

const GITHUB_API = 'https://api.github.com';
const MAX_CONTRIBUTORS = 100;
const MAX_REPOS_PER_USER = 100;
const TOP_N = 5;

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function ghFetch(url, token) {
  const res = await fetch(url, { headers: buildHeaders(token) });

  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw {
      statusCode: 429,
      message: `GitHub rate limit exceeded. Resets at ${new Date(reset * 1000).toISOString()}. Add GITHUB_TOKEN to .env`,
    };
  }
  if (!res.ok)
    throw {
      statusCode: res.status,
      message: `GitHub API error: ${res.statusText}`,
    };

  return res.json();
}

async function getContributors(owner, repo, token) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=${MAX_CONTRIBUTORS}&anon=0`;
  const data = await ghFetch(url, token);
  if (!data) return [];
  return data.map((c) => c.login);
}

async function getUserRepos(login, token) {
  const url = `${GITHUB_API}/users/${login}/repos?per_page=${MAX_REPOS_PER_USER}&type=all&sort=updated`;
  const data = await ghFetch(url, token);
  if (!data) return [];
  return data.map((r) => r.full_name);
}

// ---------------- ФАБРИЧНА ФУНКЦІЯ (Dependency Injection) ----------------
export function createGithubServiceV1({ redis }) {
  return {
    async findSharedRepos(repoPath, token) {
      const cacheKey = REDIS_KEYS.GITHUB_SHARED_REPOS(repoPath, 'v1');

      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        const result = JSON.parse(cached);
        result.meta.fromCache = true;
        return result;
      }

      const [owner, repo] = repoPath.split('/');

      const contributors = await getContributors(owner, repo, token);
      if (contributors.length === 0) {
        throw {
          statusCode: 404,
          message: `Repository "${repoPath}" not found or has no contributors`,
        };
      }

      const repoScores = new Map();

      const BATCH = 10;
      for (let i = 0; i < contributors.length; i += BATCH) {
        const batch = contributors.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((login) => getUserRepos(login, token)),
        );

        results.forEach((repos) => {
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
          const [rOwner, rRepo] = fullName.split('/');
          const meta = await ghFetch(
            `${GITHUB_API}/repos/${rOwner}/${rRepo}`,
            token,
          );
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

      const result = {
        sourceRepo: repoPath,
        totalContributorsAnalyzed: contributors.length,
        top5: enriched,
        meta: { apiVersion: 'v1 (REST only)', fromCache: false },
      };

      await redis.set(
        cacheKey,
        JSON.stringify(result),
        'EX',
        REDIS_TTL.GITHUB_CACHE,
      );

      return result;
    },
  };
}
