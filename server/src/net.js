import { fetch as undiciFetch, ProxyAgent, Agent } from 'undici';
import dns from 'node:dns/promises';
import net from 'node:net';

// All outbound traffic can be routed through the Decodo ISP proxy so the
// operator's server IP is never revealed to podcast hosts, CDNs or trackers.
const DECODO_USERNAME = process.env.DECODO_USERNAME;
const DECODO_PASSWORD = process.env.DECODO_PASSWORD;
const DECODO_HOST = process.env.DECODO_HOST || 'isp.decodo.com';
const DECODO_PORT = process.env.DECODO_PORT || '10001';

let dispatcher;
export let proxyEnabled = false;

if (DECODO_USERNAME && DECODO_PASSWORD) {
  dispatcher = new ProxyAgent({
    uri: `http://${DECODO_HOST}:${DECODO_PORT}`,
    token: 'Basic ' + Buffer.from(`${DECODO_USERNAME}:${DECODO_PASSWORD}`).toString('base64'),
    connect: { timeout: 20_000 }
  });
  proxyEnabled = true;
  console.log(`[net] outbound traffic routed via Decodo (${DECODO_HOST}:${DECODO_PORT})`);
} else {
  dispatcher = new Agent({ connect: { timeout: 20_000 } });
  console.log('[net] DECODO_USERNAME/PASSWORD not set — outbound traffic is direct');
}

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    return low === '::1' || low.startsWith('fc') || low.startsWith('fd') ||
      low.startsWith('fe80') || low.startsWith('::ffff:');
  }
  const parts = ip.split('.').map(Number);
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254);
}

// SSRF guard for the media proxy: refuse URLs that would touch private
// address space. When Decodo is active the exit node does the fetching
// anyway, but we still refuse obviously-internal targets.
export async function assertPublicHost(urlString) {
  const url = new URL(urlString);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('unsupported protocol');
  }
  const host = url.hostname;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('forbidden host');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('forbidden host');
    return;
  }
  if (!proxyEnabled) {
    // Only when fetching directly do we resolve and check the address.
    try {
      const addrs = await dns.lookup(host, { all: true });
      if (addrs.some(a => isPrivateIp(a.address))) throw new Error('forbidden host');
    } catch (e) {
      if (e.message === 'forbidden host') throw e;
      // DNS failure will surface as a fetch error; let it through.
    }
  }
}

export function proxiedFetch(url, opts = {}) {
  return undiciFetch(url, { ...opts, dispatcher, redirect: 'follow' });
}
