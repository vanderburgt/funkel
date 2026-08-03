// Podcast enclosure URLs are routinely wrapped in chains of ad-measurement
// redirects (Podtrac, Chartable, Podsights, …). Each hop logs the listener's
// IP and user agent for ad attribution. We unwrap the chain server-side and
// fetch the audio directly from the origin, which both blocks the trackers
// and removes the ad-tech redirect latency.
const TRACKER_HOSTS = [
  'podtrac.com',
  'play.podtrac.com',
  'dts.podtrac.com',
  'chtbl.com',
  'chrt.fm',
  'pdst.fm',
  'podsights.com',
  'p.podderapp.com',
  'podscribe.com',
  'pscrb.fm',
  'claritaspod.com',
  'mgln.ai',
  'arttrk.com',
  'prfx.byspotify.com',
  'gateway.fm',
  'letscastfm.com',
  'podkite.com',
  'kite.fm',
  'pdrl.fm',
  'swap.fm',
  'zencastr.com/z',
  'op3.dev',
  'verifi.podscribe.com',
  '2trck.mgln.ai',
  'audio.beyondwords.io'
];

function isTrackerHost(hostname) {
  const h = hostname.toLowerCase();
  return TRACKER_HOSTS.some(t => h === t || h.endsWith('.' + t.split('/')[0]));
}

// A path segment that "looks like" the start of the real URL: a hostname with
// a dot in it. Tracking prefixes have the form
//   https://tracker.example/TOKEN/next.tracker/TOKEN/real.host/path/file.mp3
export function stripTrackers(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return rawUrl; }

  for (let i = 0; i < 8; i++) {
    if (!isTrackerHost(url.hostname)) break;

    const path = url.pathname.replace(/^\/+/, '');
    // Embedded absolute URL (https%3A%2F%2F… or https://…) anywhere in path?
    const m = path.match(/https?(?::|%3A)(?:\/|%2F){2}(.+)$/i);
    if (m) {
      try {
        url = new URL('https://' + decodeURIComponent(m[1]).replace(/^\/+/, ''));
        continue;
      } catch { /* fall through */ }
    }
    // Otherwise find the first path segment that looks like a hostname.
    const segments = path.split('/');
    const hostIdx = segments.findIndex(s =>
      /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/i.test(s) && !/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i.test(s)
    );
    if (hostIdx === -1) break;
    try {
      url = new URL('https://' + segments.slice(hostIdx).join('/') + url.search);
    } catch { break; }
  }
  return url.toString();
}
