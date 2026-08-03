import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'funkel.db'));

// At-rest encryption (ChaCha20-Poly1305 via SQLite3MultipleCiphers). With
// DB_ENCRYPTION_KEY set, the file on disk — and any volume backup of it — is
// unreadable without the key. Set it before first launch; an existing
// plaintext database cannot be opened with a key (and vice versa).
const DB_KEY = process.env.DB_ENCRYPTION_KEY;
if (DB_KEY) {
  db.pragma(`key='${DB_KEY.replace(/'/g, "''")}'`);
  console.log('[db] at-rest encryption enabled');
} else {
  console.log('[db] DB_ENCRYPTION_KEY not set — database is stored unencrypted');
}
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  if (String(e.message).includes('not a database')) {
    console.error(
      '[db] cannot open funkel.db — the encryption key is wrong, or the file was ' +
      'created with a different DB_ENCRYPTION_KEY setting (encrypted vs plain).'
    );
    process.exit(1);
  }
  throw e;
}
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  pass_hash TEXT,
  pass_salt TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  added_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, feed_id)
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL,
  feed_id INTEGER NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  episode_title TEXT NOT NULL DEFAULT '',
  feed_title TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  enclosure_url TEXT NOT NULL DEFAULT '',
  enclosure_type TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_updated ON progress(user_id, updated_at DESC);
`);

export const q = {
  createUser: db.prepare(`INSERT INTO users (id, created_at) VALUES (?, ?)`),
  getUser: db.prepare(`SELECT * FROM users WHERE id = ?`),
  getUserByName: db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`),
  claimUser: db.prepare(`UPDATE users SET username = ?, pass_hash = ?, pass_salt = ? WHERE id = ?`),
  setSettings: db.prepare(`UPDATE users SET settings = ? WHERE id = ?`),

  addSub: db.prepare(`INSERT OR REPLACE INTO subscriptions (user_id, feed_id, title, author, image, added_at)
                      VALUES (@user_id, @feed_id, @title, @author, @image, @added_at)`),
  delSub: db.prepare(`DELETE FROM subscriptions WHERE user_id = ? AND feed_id = ?`),
  listSubs: db.prepare(`SELECT * FROM subscriptions WHERE user_id = ? ORDER BY added_at DESC`),

  upsertProgress: db.prepare(`INSERT INTO progress
    (user_id, episode_id, feed_id, position, duration, completed,
     episode_title, feed_title, image, enclosure_url, enclosure_type, updated_at)
    VALUES (@user_id, @episode_id, @feed_id, @position, @duration, @completed,
     @episode_title, @feed_title, @image, @enclosure_url, @enclosure_type, @updated_at)
    ON CONFLICT (user_id, episode_id) DO UPDATE SET
      position = @position, duration = @duration, completed = @completed,
      episode_title = @episode_title, feed_title = @feed_title, image = @image,
      enclosure_url = @enclosure_url, enclosure_type = @enclosure_type, updated_at = @updated_at`),
  listProgress: db.prepare(`SELECT * FROM progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`),
  listProgressForFeed: db.prepare(`SELECT * FROM progress WHERE user_id = ? AND feed_id = ?`),
  getProgress: db.prepare(`SELECT * FROM progress WHERE user_id = ? AND episode_id = ?`),
  deleteProgress: db.prepare(`DELETE FROM progress WHERE user_id = ? AND episode_id = ?`)
};
