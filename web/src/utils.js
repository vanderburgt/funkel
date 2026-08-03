import DOMPurify from 'dompurify';

export function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? h + ':' + mm : mm) + ':' + String(s).padStart(2, '0');
}

export function fmtDuration(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
}

export function fmtDate(unixSec) {
  if (!unixSec) return '';
  const d = new Date(unixSec * 1000);
  const now = new Date();
  const days = Math.floor((now - d) / 86400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const opts = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

export function todayLine() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  }).replace(/,/g, ' ·');
}

export function cleanHtml(html) {
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'h3', 'h4'],
    ALLOWED_ATTR: ['href'],
    ADD_ATTR: ['target', 'rel']
  });
}

export function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html || '');
  return div.textContent || '';
}

// The shareable page for an episode is its PodcastIndex URL.
export function piEpisodeUrl(feedId, episodeId) {
  return `https://podcastindex.org/podcast/${feedId}?episode=${episodeId}`;
}
export function piPodcastUrl(feedId) {
  return `https://podcastindex.org/podcast/${feedId}`;
}

export async function share({ title, url }, toast) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast?.('Link copied');
  } catch {
    toast?.(url);
  }
}
