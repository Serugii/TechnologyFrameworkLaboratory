import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache', 'reference.json');
const CACHE_TTL_MS = 120 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;

async function readCache() {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeCache(data) {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getCacheKey(url) {
  return Buffer.from(url).toString('base64');
}

async function getFromCache(url) {
  const cache = await readCache();
  const key = getCacheKey(url);
  const entry = cache[key];

  if (!entry) return null;

  const isExpired = Date.now() - entry.cachedAt > CACHE_TTL_MS;
  if (isExpired) return null;

  return entry.data;
}

async function setToCache(url, data) {
  const cache = await readCache();
  const key = getCacheKey(url);
  cache[key] = { data, cachedAt: Date.now() };
  await writeCache(cache);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url) {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fetchWithTimeout(url);
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES - 1;
      if (isLastAttempt) throw error;

      const delay = delays[attempt];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function fetchExternal(url) {
  const cached = await getFromCache(url);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchWithRetry(url);
    await setToCache(url, data);
    return data;
  } catch {
    return null;
  }
}
