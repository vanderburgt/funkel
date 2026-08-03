import { Readable } from 'node:stream';
import { proxiedFetch, assertPublicHost } from './net.js';
import { stripTrackers } from './adblock.js';

// Every byte of artwork and audio flows through this server (and out through
// Decodo when configured). The listener's browser never contacts a podcast
// host, CDN or ad-tech domain directly, so their IP and fingerprint are never
// exposed; the podcast host in turn only ever sees the proxy exit node.

const PASS_HEADERS = [
  'content-type', 'content-length', 'content-range',
  'accept-ranges', 'etag', 'last-modified'
];

async function pipeUpstream(req, res, url, extraResHeaders = {}) {
  await assertPublicHost(url);

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  const headers = { 'User-Agent': 'Funkel/1.0' };
  if (req.headers.range) headers.Range = req.headers.range;

  const upstream = await proxiedFetch(url, { headers, signal: controller.signal });

  if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
    res.status(upstream.status === 404 ? 404 : 502).end();
    return;
  }

  res.status(upstream.status);
  for (const h of PASS_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  for (const [k, v] of Object.entries(extraResHeaders)) res.setHeader(k, v);

  if (!upstream.body) { res.end(); return; }
  const stream = Readable.fromWeb(upstream.body);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

export async function imageProxy(req, res) {
  const u = req.query.u;
  if (!u) return res.status(400).json({ error: 'missing url' });
  try {
    await pipeUpstream(req, res, u, {
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
  } catch (e) {
    if (e.name === 'AbortError') return;
    res.status(502).json({ error: 'fetch failed' });
  }
}

export async function audioProxy(req, res) {
  const u = req.query.u;
  if (!u) return res.status(400).json({ error: 'missing url' });
  try {
    const clean = stripTrackers(u);
    await pipeUpstream(req, res, clean, { 'Cache-Control': 'no-store' });
  } catch (e) {
    if (e.name === 'AbortError') return;
    res.status(502).json({ error: 'fetch failed' });
  }
}
