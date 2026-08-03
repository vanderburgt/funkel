async function req(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: opts.body ? { 'content-type': 'application/json' } : undefined,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  me: () => req('/me'),
  search: q => req('/search?q=' + encodeURIComponent(q)),
  trending: cat => req('/trending' + (cat ? '?cat=' + encodeURIComponent(cat) : '')),
  podcast: id => req('/podcast/' + id),
  episode: id => req('/episode/' + id),
  inbox: () => req('/inbox'),
  subscribe: body => req('/subscriptions', { method: 'POST', body }),
  unsubscribe: feedId => req('/subscriptions/' + feedId, { method: 'DELETE' }),
  saveProgress: body => req('/progress', { method: 'PUT', body }),
  clearProgress: episodeId => req('/progress/' + episodeId, { method: 'DELETE' }),
  saveSettings: body => req('/settings', { method: 'POST', body }),
  claim: body => req('/account/claim', { method: 'POST', body }),
  login: body => req('/account/login', { method: 'POST', body }),
  logout: () => req('/account/logout', { method: 'POST' }),
  deleteAccount: () => req('/account/delete', { method: 'POST' })
};

// Every image is loaded through our proxy — the browser never touches
// podcast CDNs directly.
export const img = url => url ? '/api/img?u=' + encodeURIComponent(url) : '';
export const audioSrc = url => '/api/audio?u=' + encodeURIComponent(url);
