import { create } from 'zustand';
import { api } from './api.js';
import { applyTheme, themePref } from './theme.js';

export const useStore = create((set, get) => ({
  // ---- user ----
  loaded: false,
  username: null,
  settings: {},
  subscriptions: [],
  progress: [],        // rows from server, newest first
  progressBy: {},      // episode_id -> row
  queue: [],           // rows in play order
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
        queue: me.queue || [],
        privacy: me.privacy || null
      });
      // theme follows the account across devices
      const t = me.settings?.theme;
      if (t && t !== themePref()) applyTheme(t);
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

  // ---- listen queue ----
  inQueue(episodeId) {
    return get().queue.some(r => r.episode_id === Number(episodeId));
  },

  async queueAdd(ep, ctx = {}) {
    const { queue } = await api.queueAdd({
      episodeId: Number(ep.id ?? ep.episode_id),
      feedId: Number(ep.feedId ?? ep.feed_id ?? ctx.feedId),
      episodeTitle: ep.title ?? ep.episode_title ?? '',
      feedTitle: ctx.feedTitle ?? ep.feedTitle ?? ep.feed_title ?? ep._feedTitle ?? '',
      image: ep.image || ep.feedImage || ep._feedImage || ctx.feedImage || '',
      enclosureUrl: ep.enclosureUrl ?? ep.enclosure_url ?? '',
      enclosureType: ep.enclosureType ?? ep.enclosure_type ?? '',
      duration: Number(ep.duration) || 0
    });
    set({ queue });
    get().showToast('Added to queue');
  },

  async queueRemove(episodeId, silent = false) {
    // Optimistic: the row disappears immediately, the server catches up.
    set({ queue: get().queue.filter(r => r.episode_id !== Number(episodeId)) });
    try {
      const { queue } = await api.queueRemove(episodeId);
      set({ queue });
    } catch { /* refetched on next bootstrap */ }
    if (!silent) get().showToast('Removed from queue');
  },

  async queueMove(episodeId, delta) {
    const ids = get().queue.map(r => r.episode_id);
    const i = ids.indexOf(Number(episodeId));
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const byId = Object.fromEntries(get().queue.map(r => [r.episode_id, r]));
    set({ queue: ids.map(id => byId[id]) });
    try {
      const { queue } = await api.queueReorder(ids);
      set({ queue });
    } catch { /* keep the optimistic order */ }
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
