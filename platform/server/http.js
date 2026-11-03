/* Small HTTP toolkit for the JSON API: routing, body parsing, cookies, CSRF and rate limits. */
export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
export const bad = (msg) => new HttpError(400, msg);

export function createRouter() {
  const routes = [];
  const add = (method) => (pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:[a-zA-Z_]+/g, (k) => { keys.push(k.slice(1)); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, handler, opts });
  };
  return {
    get: add('GET'), post: add('POST'), put: add('PUT'), del: add('DELETE'),
    match(method, pathname) {
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = r.re.exec(pathname); if (!m) continue;
        return { ...r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
      }
      return null;
    },
  };
}

export function readBody(req, limit = 400_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'That upload is too big.')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
export async function readJson(req) {
  const text = await readBody(req);
  if (!text) return {};
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : {}; } catch { throw bad('Invalid JSON.'); }
}
export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export const isHttps = (req) => String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https' || req.socket.encrypted;
export function cookie(name, value, { maxAge, req }) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${isHttps(req) ? '; Secure' : ''}${maxAge != null ? `; Max-Age=${maxAge}` : ''}`;
}
export function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  res.end(JSON.stringify(body));
}
export const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

/* Fixed-window rate limiter kept in memory. Good enough for one server instance. */
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) { buckets.set(key, { start: now, n: 1 }); return; }
  if (++b.n > max) throw new HttpError(429, 'Too many requests. Wait a moment and try again.');
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.start > 10 * 60_000) buckets.delete(k); }, 60_000).unref();

/* CSRF: state-changing requests must carry a custom header, which other sites can’t send without CORS (which we never enable). */
export function requireSameSite(req) {
  if (req.headers['x-oddball'] !== '1') throw new HttpError(403, 'Missing request header.');
}

export const clean = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
export function safeUrl(u, { allowEmpty = true } = {}) {
  const s = String(u ?? '').trim();
  if (!s) { if (allowEmpty) return null; throw bad('A link is required.'); }
  let url; try { url = new URL(s); } catch { throw bad('That link isn’t a valid URL.'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw bad('Links must start with https://');
  if (s.length > 500) throw bad('That link is too long.');
  return url.toString();
}
export function safeImage(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) { if (s.length > 350_000) throw bad('Images must be under about 250 KB.'); return s; }
  if (/^data:image\/svg\+xml/.test(s)) throw bad('SVG uploads aren’t allowed. Use PNG, JPG, WebP or GIF.');
  return safeUrl(s);
}
export function safeDate(v) {
  if (v == null || v === '') return null;
  const d = new Date(v); if (Number.isNaN(d.getTime())) throw bad('That date isn’t valid.');
  return d.toISOString();
}
