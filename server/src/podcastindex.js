import crypto from 'node:crypto';
import { proxiedFetch } from './net.js';

const API = 'https://api.podcastindex.org/api/1.0';
const KEY = (process.env.PODCASTINDEX_KEY || '').trim();
const SECRET = (process.env.PODCASTINDEX_SECRET || '').trim();

if (!KEY || !SECRET) {
  console.error('[pi] PODCASTINDEX_KEY / PODCASTINDEX_SECRET missing — set them in .env');
} else {
  // Length only — helps catch env mangling (e.g. `$` interpolation by
  // docker compose eating characters) without ever logging the values.
  console.log(`[pi] credentials loaded — key ${KEY.length} chars, secret ${SECRET.length} chars`);
}

// Small TTL cache so repeated navigation is instant and we stay polite to the API.
const cache = new Map();
const CACHE_MAX = 500;

function cacheGet(k) {
  const hit = cache.get(k);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(k); return null; }
  return hit.value;
}

function cacheSet(k, value, ttlMs) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(k, { value, expires: Date.now() + ttlMs });
}

export async function pi(path, params = {}, ttlMs = 5 * 60_000) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API}${path}${qs ? '?' + qs : ''}`;

  const cached = cacheGet(url);
  if (cached) return cached;

  const ts = Math.floor(Date.now() / 1000).toString();
  const auth = crypto.createHash('sha1').update(KEY + SECRET + ts).digest('hex');

  const res = await proxiedFetch(url, {
    headers: {
      'X-Auth-Key': KEY,
      'X-Auth-Date': ts,
      'Authorization': auth,
      'User-Agent': 'Funkel/1.0'
    }
  });
  if (!res.ok) throw new Error(`PodcastIndex ${res.status} for ${path}`);
  const json = await res.json();
  cacheSet(url, json, ttlMs);
  return json;
}
