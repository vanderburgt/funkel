import { Router } from 'express';
import { pi } from './podcastindex.js';
import { db, q } from './db.js';
import { setCookie, hashPassword, verifyPassword } from './session.js';
import { imageProxy, audioProxy } from './proxy.js';
import { stripTrackers } from './adblock.js';
import { proxyEnabled } from './net.js';

export const api = Router();

const wrap = fn => (req, res) => fn(req, res).catch(err => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ---------- bootstrap ----------

api.get('/me', wrap(async (req, res) => {
  const user = q.getUser.get(req.uid);
  res.json({
    username: user?.username || null,
    settings: JSON.parse(user?.settings || '{}'),
    subscriptions: q.listSubs.all(req.uid),
    progress: q.listProgress.all(req.uid, 100),
    privacy: { relay: proxyEnabled }
  });
}));

api.post('/settings', wrap(async (req, res) => {
  const user = q.getUser.get(req.uid);
  const merged = { ...JSON.parse(user.settings || '{}'), ...req.body };
  q.setSettings.run(JSON.stringify(merged), req.uid);
  res.json({ settings: merged });
}));

// ---------- optional account sync ----------

api.post('/account/claim', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 8) {
    return res.status(400).json({ error: 'Username and a passphrase of at least 8 characters required.' });
  }
  if (q.getUserByName.get(username)) {
    return res.status(409).json({ error: 'That name is taken.' });
  }
  const { salt, hash } = hashPassword(password);
  q.claimUser.run(username, hash, salt, req.uid);
  res.json({ username });
}));

api.post('/account/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const user = username && q.getUserByName.get(username);
  if (!user || !user.pass_hash || !verifyPassword(password || '', user.pass_salt, user.pass_hash)) {
    return res.status(401).json({ error: 'Wrong name or passphrase.' });
  }
  setCookie(req, res, user.id);
  res.json({ username: user.username });
}));

api.post('/account/logout', wrap(async (req, res) => {
  // A fresh anonymous identity; the old account remains reachable via login.
  const crypto = await import('node:crypto');
  const uid = crypto.randomUUID();
  q.createUser.run(uid, Date.now());
  setCookie(req, res, uid);
  res.json({ ok: true });
}));

// ---------- podcast index ----------

api.get('/search', wrap(async (req, res) => {
  const qterm = String(req.query.q || '').trim();
  if (!qterm) return res.json({ feeds: [] });
  const data = await pi('/search/byterm', { q: qterm, max: 30, fulltext: '' }, 5 * 60_000);
  res.json({ feeds: data.feeds || [] });
}));

api.get('/trending', wrap(async (req, res) => {
  const params = { max: 24, lang: 'en' };
  if (req.query.cat) params.cat = req.query.cat;
  const data = await pi('/podcasts/trending', params, 30 * 60_000);
  res.json({ feeds: data.feeds || [] });
}));

api.get('/podcast/:feedId', wrap(async (req, res) => {
  const id = Number(req.params.feedId);
  const [feedData, epData] = await Promise.all([
    pi('/podcasts/byfeedid', { id }, 10 * 60_000),
    pi('/episodes/byfeedid', { id, max: 300, fulltext: '' }, 5 * 60_000)
  ]);
  res.json({ feed: feedData.feed || null, episodes: epData.items || [] });
}));

api.get('/episode/:id', wrap(async (req, res) => {
  const data = await pi('/episodes/byid', { id: Number(req.params.id), fulltext: '' }, 60 * 60_000);
  res.json({ episode: data.episode || null });
}));

// Latest episodes across every subscription — the "front page" feed.
api.get('/inbox', wrap(async (req, res) => {
  const subs = q.listSubs.all(req.uid).slice(0, 40);
  const results = await Promise.allSettled(
    subs.map(s => pi('/episodes/byfeedid', { id: s.feed_id, max: 4, fulltext: '' }, 5 * 60_000))
  );
  const episodes = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      for (const ep of r.value.items || []) {
        episodes.push({ ...ep, _feedTitle: subs[i].title, _feedImage: subs[i].image });
      }
    }
  });
  episodes.sort((a, b) => (b.datePublished || 0) - (a.datePublished || 0));
  res.json({ episodes: episodes.slice(0, 60) });
}));

// ---------- subscriptions ----------

api.post('/subscriptions', wrap(async (req, res) => {
  const { feedId, title = '', author = '', image = '' } = req.body || {};
  if (!feedId) return res.status(400).json({ error: 'feedId required' });
  q.addSub.run({
    user_id: req.uid, feed_id: Number(feedId),
    title: String(title), author: String(author), image: String(image),
    added_at: Date.now()
  });
  res.json({ subscriptions: q.listSubs.all(req.uid) });
}));

api.delete('/subscriptions/:feedId', wrap(async (req, res) => {
  q.delSub.run(req.uid, Number(req.params.feedId));
  res.json({ subscriptions: q.listSubs.all(req.uid) });
}));

// ---------- progress ----------

api.get('/progress', wrap(async (req, res) => {
  res.json({ progress: q.listProgress.all(req.uid, 100) });
}));

api.put('/progress', wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.episodeId || !b.feedId) return res.status(400).json({ error: 'episodeId and feedId required' });
  q.upsertProgress.run({
    user_id: req.uid,
    episode_id: Number(b.episodeId),
    feed_id: Number(b.feedId),
    position: Number(b.position) || 0,
    duration: Number(b.duration) || 0,
    completed: b.completed ? 1 : 0,
    episode_title: String(b.episodeTitle || ''),
    feed_title: String(b.feedTitle || ''),
    image: String(b.image || ''),
    enclosure_url: String(b.enclosureUrl || ''),
    enclosure_type: String(b.enclosureType || ''),
    updated_at: Date.now()
  });
  res.json({ ok: true });
}));

api.delete('/progress/:episodeId', wrap(async (req, res) => {
  q.deleteProgress.run(req.uid, Number(req.params.episodeId));
  res.json({ ok: true });
}));

// ---------- privacy proxy ----------

api.get('/img', imageProxy);
api.get('/audio', audioProxy);

// Expose the cleaned URL so the client can show what was stripped (Settings → privacy).
api.get('/clean-url', wrap(async (req, res) => {
  const u = String(req.query.u || '');
  res.json({ original: u, cleaned: stripTrackers(u) });
}));
