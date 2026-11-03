/* Accounts and sessions. Passwords use scrypt; sessions are random tokens stored hashed. */
import crypto from 'node:crypto';
import { q, one } from './db.js';
import { HttpError, bad, parseCookies, cookie, clean } from './http.js';

const COOKIE = 'ob_session';
const SESSION_DAYS = 30;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function checkPassword(pw, stored) {
  const [alg, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(hash, 'base64');
  const got = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), want.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(want, got);
}
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newLinkCode() {
  const b = crypto.randomBytes(5); let s = 'ODD-';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return s;
}

export function validUsername(u) {
  const s = clean(u, 40);
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(s)) throw bad('Usernames are 3–20 letters, numbers, - or _.');
  return s;
}
export async function register({ username, password }) {
  const name = validUsername(username);
  if (typeof password !== 'string' || password.length < 8) throw bad('Passwords need at least 8 characters.');
  if (password.length > 200) throw bad('That password is too long.');
  if (await one('select 1 from users where username_lc = $1', [name.toLowerCase()])) throw new HttpError(409, 'That username is taken.');
  const id = crypto.randomUUID();
  let code = newLinkCode();
  while (await one('select 1 from users where link_code = $1', [code])) code = newLinkCode();
  await q('insert into users (id, username, username_lc, pass_hash, link_code) values ($1, $2, $3, $4, $5)', [id, name, name.toLowerCase(), hashPassword(password), code]);
  return id;
}
export async function login({ username, password }) {
  const u = await one('select id, pass_hash from users where username_lc = $1', [String(username || '').toLowerCase()]);
  // always run a hash so response time doesn't reveal whether the username exists
  const ok = u ? checkPassword(String(password || ''), u.pass_hash) : (checkPassword('x', 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='), false);
  if (!ok) throw new HttpError(401, 'Wrong username or password.');
  return u.id;
}
export async function startSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await q('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), userId, expires.toISOString()]);
  res.setHeader('set-cookie', cookie(COOKIE, token, { maxAge: SESSION_DAYS * 86400, req }));
}
export async function endSession(req, res) {
  const t = parseCookies(req)[COOKIE];
  if (t) await q('delete from sessions where token_hash = $1', [sha256(t)]);
  res.setHeader('set-cookie', cookie(COOKIE, '', { maxAge: 0, req }));
}
/** The signed-in user for this request, or null. Role always comes from the database. */
export async function currentUser(req) {
  const t = parseCookies(req)[COOKIE];
  if (!t || t.length > 100) return null;
  return one(`select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`, [sha256(t)]);
}
export async function requireUser(req) {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, 'Please sign in first.');
  return u;
}
export async function requireAdmin(req) {
  const u = await requireUser(req);
  if (u.role !== 'admin') throw new HttpError(403, 'Admins only.');
  return u;
}
export async function audit(actorId, action, target, details = {}) {
  await q('insert into audit_log (actor_id, action, target, details) values ($1, $2, $3, $4)', [actorId || null, action, target || null, JSON.stringify(details)]);
}
