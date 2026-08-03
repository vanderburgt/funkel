import crypto from 'node:crypto';
import { db, q } from './db.js';

const COOKIE = 'funkel_uid';
const YEAR = 365 * 24 * 3600 * 1000;

// Privacy model: no email, no tracking, no third parties. Every browser gets
// an anonymous identity in a httpOnly cookie so subscriptions and progress
// survive refreshes. Optionally the user can attach a username + passphrase
// to that identity to carry it across devices.

export function sessionMiddleware(req, res, next) {
  let uid = req.cookies[COOKIE];
  if (!uid || !q.getUser.get(uid)) {
    uid = crypto.randomUUID();
    q.createUser.run(uid, Date.now());
    setCookie(req, res, uid);
  }
  req.uid = uid;
  next();
}

export function setCookie(req, res, uid) {
  res.cookie(COOKIE, uid, {
    httpOnly: true,
    sameSite: 'lax',
    // req.protocol respects trust proxy, so this is correct behind Coolify's
    // TLS-terminating proxy and still works on plain-HTTP setups.
    secure: req.protocol === 'https',
    maxAge: YEAR,
    path: '/'
  });
}

export function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, expected) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}
