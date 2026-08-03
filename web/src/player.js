import { useStore } from './store.js';
import { api, img, audioSrc } from './api.js';

// One HTMLAudioElement for the whole app, living outside React.
const audio = new Audio();
audio.preload = 'metadata';

const SKIP_BACK = 15;
const SKIP_FWD = 30;
const store = useStore;

let saveTimer = 0;
let sleepTimer = null;

// ---------- engine ----------

export function playEpisode(ep, ctx = {}) {
  const s = store.getState();
  const norm = {
    episodeId: Number(ep.id ?? ep.episode_id),
    feedId: Number(ep.feedId ?? ep.feed_id ?? ctx.feedId),
    title: ep.title ?? ep.episode_title ?? '',
    feedTitle: ctx.feedTitle ?? ep.feedTitle ?? ep.feed_title ?? ep._feedTitle ?? '',
    image: ep.image || ep.feedImage || ep._feedImage || ctx.feedImage || ep.image_ || '',
    enclosureUrl: ep.enclosureUrl ?? ep.enclosure_url,
    enclosureType: ep.enclosureType ?? ep.enclosure_type ?? '',
    duration: Number(ep.duration) || 0
  };
  if (!norm.enclosureUrl) return;

  if (s.current?.episodeId === norm.episodeId) {
    toggle();
    return;
  }

  // Resume where the listener left off, unless the episode was finished.
  const saved = s.progressBy[norm.episodeId];
  const resumeAt = saved && !saved.completed && saved.position > 5 &&
    (!saved.duration || saved.position < saved.duration * 0.95)
    ? saved.position : 0;

  store.setState({
    current: norm,
    playing: false,
    buffering: true,
    position: resumeAt,
    duration: norm.duration
  });

  audio.src = audioSrc(norm.enclosureUrl);
  audio.currentTime = resumeAt;
  audio.playbackRate = store.getState().rate;
  audio.play().catch(() => store.setState({ buffering: false }));

  setMediaSession(norm);
}

export function toggle() {
  if (!store.getState().current) return;
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

export function seekTo(sec) {
  const d = audio.duration || store.getState().duration || 0;
  audio.currentTime = Math.min(Math.max(0, sec), d ? d - 0.5 : sec);
  store.setState({ position: audio.currentTime });
  saveProgress();
}

export function skip(delta) {
  seekTo(audio.currentTime + delta);
}

export function setRate(rate) {
  audio.playbackRate = rate;
  store.setState({ rate });
  api.saveSettings({ rate }).catch(() => {});
}

const SLEEP_STEPS = [0, 15 * 60, 30 * 60, 45 * 60, 60 * 60];

export function cycleSleep() {
  const left = store.getState().sleepLeft;
  const idx = SLEEP_STEPS.findIndex(x => left <= x);
  const next = SLEEP_STEPS[(Math.max(idx, 0) + 1) % SLEEP_STEPS.length];
  setSleep(next);
  store.getState().showToast(next ? `Sleep in ${next / 60} min` : 'Sleep timer off');
}

function setSleep(seconds) {
  clearInterval(sleepTimer);
  sleepTimer = null;
  store.setState({ sleepLeft: seconds });
  if (seconds > 0) {
    sleepTimer = setInterval(() => {
      const left = store.getState().sleepLeft - 1;
      if (left <= 0) {
        clearInterval(sleepTimer);
        sleepTimer = null;
        store.setState({ sleepLeft: 0 });
        audio.pause();
      } else {
        store.setState({ sleepLeft: left });
      }
    }, 1000);
  }
}

export function markPlayed(ep, ctx = {}) {
  const episodeId = Number(ep.id ?? ep.episode_id);
  const row = {
    episode_id: episodeId,
    feed_id: Number(ep.feedId ?? ep.feed_id ?? ctx.feedId),
    position: Number(ep.duration) || 0,
    duration: Number(ep.duration) || 0,
    completed: 1,
    episode_title: ep.title ?? ep.episode_title ?? '',
    feed_title: ctx.feedTitle ?? ep.feed_title ?? '',
    image: ep.image || ep.feedImage || ctx.feedImage || '',
    enclosure_url: ep.enclosureUrl ?? ep.enclosure_url ?? '',
    enclosure_type: ep.enclosureType ?? ep.enclosure_type ?? '',
    updated_at: Date.now()
  };
  store.getState().setProgressRow(row);
  api.saveProgress({
    episodeId, feedId: row.feed_id, position: row.position, duration: row.duration,
    completed: true, episodeTitle: row.episode_title, feedTitle: row.feed_title,
    image: row.image, enclosureUrl: row.enclosure_url, enclosureType: row.enclosure_type
  }).catch(() => {});
}

// ---------- progress persistence ----------

function saveProgress(completed = false) {
  const { current, position, duration } = store.getState();
  if (!current) return;
  const done = completed || (duration > 0 && position > duration * 0.97);
  const row = {
    episode_id: current.episodeId,
    feed_id: current.feedId,
    position,
    duration,
    completed: done ? 1 : 0,
    episode_title: current.title,
    feed_title: current.feedTitle,
    image: current.image,
    enclosure_url: current.enclosureUrl,
    enclosure_type: current.enclosureType,
    updated_at: Date.now()
  };
  store.getState().setProgressRow(row);
  api.saveProgress({
    episodeId: current.episodeId,
    feedId: current.feedId,
    position,
    duration,
    completed: done,
    episodeTitle: current.title,
    feedTitle: current.feedTitle,
    image: current.image,
    enclosureUrl: current.enclosureUrl,
    enclosureType: current.enclosureType
  }).catch(() => {});
}

// ---------- audio element events ----------

audio.addEventListener('play', () => {
  store.setState({ playing: true });
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

audio.addEventListener('pause', () => {
  store.setState({ playing: false });
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  saveProgress();
});

audio.addEventListener('timeupdate', () => {
  store.setState({ position: audio.currentTime });
  const now = Date.now();
  if (now - saveTimer > 5000) {
    saveTimer = now;
    saveProgress();
    updatePositionState();
  }
});

audio.addEventListener('durationchange', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    store.setState({ duration: audio.duration });
    updatePositionState();
  }
});

audio.addEventListener('waiting', () => store.setState({ buffering: true }));
audio.addEventListener('playing', () => store.setState({ buffering: false }));
audio.addEventListener('canplay', () => store.setState({ buffering: false }));

audio.addEventListener('ended', () => {
  store.setState({ playing: false });
  saveProgress(true);
});

audio.addEventListener('error', () => {
  if (!audio.src) return;
  store.setState({ buffering: false, playing: false });
  store.getState().showToast('Could not load this episode');
});

window.addEventListener('beforeunload', () => {
  if (!audio.paused) saveProgress();
});

// ---------- lock screen / media session ----------

function setMediaSession(ep) {
  if (!('mediaSession' in navigator)) return;
  const art = ep.image ? img(ep.image) : '/icon-512.png';
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title,
    artist: ep.feedTitle,
    album: 'Funkel',
    artwork: [
      { src: art, sizes: '512x512', type: 'image/jpeg' },
      { src: art, sizes: '192x192', type: 'image/jpeg' }
    ]
  });
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => audio.play());
  ms.setActionHandler('pause', () => audio.pause());
  ms.setActionHandler('seekbackward', d => skip(-(d?.seekOffset || SKIP_BACK)));
  ms.setActionHandler('seekforward', d => skip(d?.seekOffset || SKIP_FWD));
  ms.setActionHandler('seekto', d => {
    if (d.fastSeek && 'fastSeek' in audio) audio.fastSeek(d.seekTime);
    else seekTo(d.seekTime);
  });
  try {
    ms.setActionHandler('previoustrack', () => skip(-SKIP_BACK));
    ms.setActionHandler('nexttrack', () => skip(SKIP_FWD));
  } catch { /* optional */ }
}

function updatePositionState() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const d = audio.duration;
  if (!Number.isFinite(d) || d <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: d,
      playbackRate: audio.playbackRate,
      position: Math.min(audio.currentTime, d)
    });
  } catch { /* ignore */ }
}

// Apply the user's saved default speed once settings load.
let appliedDefaultRate = false;
store.subscribe((state) => {
  if (!appliedDefaultRate && state.loaded) {
    appliedDefaultRate = true;
    const r = Number(state.settings?.rate);
    if (r && r >= 0.5 && r <= 3) {
      audio.playbackRate = r;
      store.setState({ rate: r });
    }
  }
});
