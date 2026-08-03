import { create } from 'zustand';
import { api } from './api.js';

export const useStore = create((set, get) => ({
  // ---- user ----
  loaded: false,
  username: null,
  settings: {},
  subscriptions: [],
  progress: [],        // rows from server, newest first
  progressBy: {},      // episode_id -> row
  privacy: null,

  async bootstrap() {
    try {
      const me = await api.me();
      set({
        loaded: true,
        username: me.username,
        settings: me.settings || {},
        subscriptions: me.subscriptions || [],
        progress: me.progress || [],
        progressBy: index(me.progress),
        privacy: me.privacy || null
      });
    } catch {
      set({ loaded: true });
    }
  },

  isSubscribed(feedId) {
    return get().subscriptions.some(s => s.feed_id === Number(feedId));
  },

  async toggleSubscribe(feed) {
    const feedId = Number(feed.id || feed.feed_id);
    if (get().isSubscribed(feedId)) {
      const { subscriptions } = await api.unsubscribe(feedId);
      set({ subscriptions });
      get().showToast('Unfollowed');
    } else {
      const { subscriptions } = await api.subscribe({
        feedId,
        title: feed.title || '',
        author: feed.author || feed.ownerName || '',
        image: feed.image || feed.artwork || ''
      });
      set({ subscriptions });
      get().showToast('Following ' + (feed.title || 'show'));
    }
  },

  setProgressRow(row) {
    const progress = [row, ...get().progress.filter(p => p.episode_id !== row.episode_id)];
    set({ progress, progressBy: index(progress) });
  },
  removeProgressRow(episodeId) {
    const progress = get().progress.filter(p => p.episode_id !== episodeId);
    set({ progress, progressBy: index(progress) });
  },

  async saveSettings(patch) {
    const { settings } = await api.saveSettings(patch);
    set({ settings });
  },

  // ---- player ----
  current: null,       // { episodeId, feedId, title, feedTitle, image, enclosureUrl, enclosureType, duration }
  playing: false,
  position: 0,
  duration: 0,
  buffering: false,
  rate: 1,
  sheetOpen: false,
  sleepLeft: 0,        // seconds remaining, 0 = off

  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),

  // ---- toast ----
  toast: null,
  showToast(msg) {
    set({ toast: msg });
    clearTimeout(get()._toastTimer);
    const t = setTimeout(() => set({ toast: null }), 2400);
    set({ _toastTimer: t });
  },
  _toastTimer: null
}));

function index(rows) {
  const by = {};
  for (const r of rows || []) by[r.episode_id] = r;
  return by;
}
