/* Macro / Micro: photo curation (admin), image delivery and answer checking.
 * Photos come from Wikimedia Commons. When an admin approves one, the server downloads it ONCE, checks the
 * licence, and stores two zoom layers in the database, so the game never depends on outside links. */
import crypto from 'node:crypto';
import sharp from 'sharp';
import { q, one } from './db.js';
import { HttpError, bad, readJson, rateLimit, clientIp, clean } from './http.js';
import { requireAdmin, audit } from './auth.js';
import { OBJECTS, BY_ID, CATEGORIES } from '../../games/macro-micro/shared/objects.js';
import { judge, buildVocab } from '../../games/macro-micro/shared/answers.js';
const VOCAB = buildVocab(OBJECTS);
import { detailRegion, DIFFICULTY } from '../../games/macro-micro/shared/scoring.js';

const API = process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php';
const UPLOAD_HOSTS = (process.env.COMMONS_UPLOAD_HOSTS || 'upload.wikimedia.org').split(',').map((h) => h.trim());
const UA = 'oddball-macro-micro/1.0 (https://oddball-n2dm.onrender.com)';
const MAX_BYTES = 45 * 1024 * 1024;
const FREE = /^(cc0|pd|cc-by(-sa)?-\d)/i;   // CC0, public domain, CC BY, CC BY-SA
const DISPLAY_PX = 1400;                  // device pixels across a typical game screen

/* Players never see the real ids ("coin", "cat-eye" would give the answer away). They get opaque ids made
 * from a random secret that is generated once and kept in the database. */
let SALT = null, PUB = null, PRIV = null;
async function ids() {
  if (PUB) return { pub: PUB, priv: PRIV };
  let row = await one(`select value from config where key = 'macro_salt'`);
  if (!row) { await q(`insert into config (key, value) values ('macro_salt', $1) on conflict (key) do nothing`, [JSON.stringify(crypto.randomBytes(24).toString('hex'))]); row = await one(`select value from config where key = 'macro_salt'`); }
  SALT = row.value;
  PUB = {}; PRIV = {};
  for (const o of OBJECTS) { const h = crypto.createHmac('sha256', SALT).update(o.id).digest('hex').slice(0, 14); PUB[o.id] = h; PRIV[h] = o.id; }
  return { pub: PUB, priv: PRIV };
}
const objFromPublic = async (pid) => { const { priv } = await ids(); const id = priv[String(pid || '')]; return id ? BY_ID[id] : null; };

const stripTags = (h) => String(h || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, '’').replace(/\s+/g, ' ').trim().slice(0, 200);

/** Look a file up on Commons: size, download link, author and licence. */
export async function commonsInfo(title) {
  const t = clean(title, 250).replace(/^(file|image):/i, '').trim();
  if (!t || /[#<>[\]|{}]/.test(t)) throw bad('That doesn’t look like a Commons file name.');
  const u = new URL(API);
  u.search = new URLSearchParams({ action: 'query', format: 'json', titles: `File:${t}`, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '6000' }).toString();
  let r;
  try { r = await fetch(u, { headers: { 'user-agent': UA } }); } catch (e) { throw new HttpError(502, 'Couldn’t reach Wikimedia Commons.'); }
  if (!r.ok) throw new HttpError(502, `Commons answered ${r.status}.`);
  const j = await r.json();
  const page = j.query && Object.values(j.query.pages || {})[0];
  if (!page || page.missing !== undefined || !page.imageinfo) throw bad('No such file on Commons.');
  const info = page.imageinfo[0], meta = info.extmetadata || {};
  const code = String((meta.License && meta.License.value) || '').toLowerCase();
  const short = stripTags(meta.LicenseShortName && meta.LicenseShortName.value);
  if (!FREE.test(code) && !/public domain/i.test(short)) throw bad(`That photo’s licence (${short || 'unknown'}) isn’t one we can use. Pick a CC0, public domain, CC BY or CC BY-SA photo.`);
  if (!/^image\/(jpeg|png|webp|tiff)$/.test(info.mime)) throw bad('Only JPEG, PNG, WebP or TIFF photos work.');
  if (Math.min(info.width, info.height) < 1500) throw bad('That photo is too small to zoom into. Pick one at least 1500 pixels on its short side.');
  return {
    title: page.title, width: info.width, height: info.height,
    download: info.thumburl && info.thumbwidth < info.width ? info.thumburl : info.url,
    author: stripTags(meta.Artist && meta.Artist.value) || 'Unknown author', license: short || code.toUpperCase(),
    licenseUrl: (meta.LicenseUrl && meta.LicenseUrl.value) || null, sourceUrl: info.descriptionurl || null,
  };
}

async function download(url) {
  let parsed; try { parsed = new URL(url); } catch (e) { throw bad('Bad download link.'); }
  if (!UPLOAD_HOSTS.includes(parsed.host)) throw bad('Downloads are only allowed from Wikimedia’s image server.');
  const r = await fetch(parsed, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new HttpError(502, `Couldn’t download the photo (${r.status}).`);
  if (Number(r.headers.get('content-length') || 0) > MAX_BYTES) throw bad('That file is too big.');
  const chunks = []; let size = 0;
  for await (const c of r.body) { size += c.length; if (size > MAX_BYTES) throw bad('That file is too big.'); chunks.push(c); }
  return Buffer.concat(chunks);
}

/** Turns one photo into the game's layers: the whole photo, a full-resolution crop around the focus point, a thumbnail. */
export async function makeLayers(buf, focus) {
  const upright = await sharp(buf, { limitInputPixels: 160_000_000 }).rotate().toBuffer({ resolveWithObject: true });
  const W = upright.info.width, H = upright.info.height;
  const img = () => sharp(upright.data, { limitInputPixels: 160_000_000 });
  const reg = detailRegion(focus);
  const rect = { left: Math.round(reg.x * W), top: Math.round(reg.y * H), width: Math.round(reg.w * W), height: Math.round(reg.h * H) };
  rect.width = Math.min(rect.width, W - rect.left); rect.height = Math.min(rect.height, H - rect.top);
  const [full, detail, thumb] = await Promise.all([
    img().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    img().extract(rect).resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true }),
    img().resize({ width: 480, height: 480, fit: 'inside' }).webp({ quality: 74 }).toBuffer(),
  ]);
  // how far in we can go before the detail layer is stretched by more than ~1.4x on a typical screen
  const effectiveWidth = detail.info.width / reg.w;
  const zoomLimit = Math.max(1.5, Math.min(12, (effectiveWidth / DISPLAY_PX) * 1.4));
  return { W, H, full, detail: detail.data, thumb, zoomLimit: Math.round(zoomLimit * 10) / 10 };
}

const reveal = (o, c) => ({
  name: o.name, fact: o.fact, category: CATEGORIES[o.category],
  credit: c ? { author: c.author, license: c.license, licenseUrl: c.license_url, sourceUrl: c.source_url, file: c.file_title } : null,
});

export function registerMacro(r) {
  /* public: playable objects, without names or answers */
  r.get('/api/macro/objects', async () => {
    const rows = await q('select * from macro_curation where approved');
    const { pub } = await ids();
    const out = [];
    for (const c of rows) {
      const o = BY_ID[c.object_id]; if (!o) continue;
      out.push({ id: pub[o.id], category: o.category, difficulty: o.difficulty, aspect: c.width / c.height, focus: { x: c.focus_x, y: c.focus_y }, startZoom: Math.min(c.start_zoom, c.zoom_limit), region: detailRegion({ x: c.focus_x, y: c.focus_y }), v: new Date(c.updated_at).getTime() });
    }
    return { objects: out, total: OBJECTS.length };
  });
  r.post('/api/macro/guess', async (req) => {
    rateLimit(`macro:${clientIp(req)}`, 120, 60_000);
    const b = await readJson(req);
    const o = await objFromPublic(b.id); if (!o) throw bad('Unknown photo.');
    const result = judge(o, clean(b.guess, 80), VOCAB);
    if (result !== 'correct') return { result };
    return { result, reveal: reveal(o, await one('select * from macro_curation where object_id = $1', [o.id])) };
  });
  r.post('/api/macro/reveal', async (req) => {
    rateLimit(`macro:${clientIp(req)}`, 120, 60_000);
    const b = await readJson(req);
    const o = await objFromPublic(b.id); if (!o) throw bad('Unknown photo.');
    return { reveal: reveal(o, await one('select * from macro_curation where object_id = $1', [o.id])) };
  });
  r.get('/api/macro/credits', async () => {
    const rows = await q('select object_id, author, license, license_url, source_url, file_title from macro_curation where approved order by object_id');
    return { credits: rows.filter((c) => BY_ID[c.object_id]).map((c) => ({ name: BY_ID[c.object_id].name, author: c.author, license: c.license, licenseUrl: c.license_url, sourceUrl: c.source_url, file: c.file_title })) };
  });

  /* admin: the photo picker */
  r.get('/api/macro/admin', async (req) => {
    await requireAdmin(req);
    const cur = Object.fromEntries((await q('select object_id, file_title, focus_x, focus_y, start_zoom, zoom_limit, width, height, author, license, approved, updated_at from macro_curation')).map((c) => [c.object_id, c]));
    const { pub } = await ids();
    return { objects: OBJECTS.map((o) => ({ ...o, pid: pub[o.id], defaultZoom: DIFFICULTY[o.difficulty].defaultZoom, curation: cur[o.id] || null })), categories: CATEGORIES, commonsApi: API };
  });
  r.post('/api/macro/admin/:id', async (req, res, p) => {
    const u = await requireAdmin(req);
    const o = BY_ID[p.id]; if (!o) throw new HttpError(404, 'Unknown object.');
    const b = await readJson(req);
    const fx = Number(b.focus && b.focus.x), fy = Number(b.focus && b.focus.y), z = Number(b.startZoom);
    if (![fx, fy].every((v) => v >= 0 && v <= 1)) throw bad('Click the photo to choose where the zoom starts.');
    if (!(z >= 1.5 && z <= 12)) throw bad('Starting zoom must be between 1.5× and 12×.');
    rateLimit(`macro-admin:${u.id}`, 20, 60_000);
    const info = await commonsInfo(b.file);
    const layers = await makeLayers(await download(info.download), { x: fx, y: fy });
    await q(`insert into macro_curation (object_id, file_title, focus_x, focus_y, start_zoom, zoom_limit, width, height, author, license, license_url, source_url, approved, updated_by, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,now())
             on conflict (object_id) do update set file_title=$2, focus_x=$3, focus_y=$4, start_zoom=$5, zoom_limit=$6, width=$7, height=$8, author=$9, license=$10, license_url=$11, source_url=$12, approved=true, updated_by=$13, updated_at=now()`,
      [o.id, info.title, fx, fy, z, layers.zoomLimit, layers.W, layers.H, info.author, info.license, info.licenseUrl, info.sourceUrl, u.id]);
    for (const [kind, data] of [['full', layers.full], ['detail', layers.detail], ['thumb', layers.thumb]]) {
      await q('insert into macro_images (object_id, kind, mime, data) values ($1,$2,$3,$4) on conflict (object_id, kind) do update set mime = $3, data = $4', [o.id, kind, 'image/webp', data]);
    }
    await audit(u.id, 'macro.photo_approved', o.id, { file: info.title, license: info.license, startZoom: z });
    return { ok: true, zoomLimit: layers.zoomLimit, startZoom: Math.min(z, layers.zoomLimit), sharpUntil: layers.zoomLimit, license: info.license, author: info.author };
  });
  r.post('/api/macro/admin/:id/remove', async (req, res, p) => {
    const u = await requireAdmin(req);
    await q('delete from macro_curation where object_id = $1', [p.id]);
    await audit(u.id, 'macro.photo_removed', p.id);
    return { ok: true };
  });
}

/** Binary image route: /api/macro/img/<id>/<full|detail|thumb> */
export async function serveMacroImage(req, res, url) {
  const [, , , , pid, kind] = url.pathname.split('/');
  const o = await objFromPublic(pid);
  if (!o || !['full', 'detail', 'thumb'].includes(kind)) { res.writeHead(404); return res.end(); }
  const id = o.id;
  const row = await one('select i.mime, i.data from macro_images i join macro_curation c on c.object_id = i.object_id where i.object_id = $1 and i.kind = $2 and c.approved', [id, kind]);
  if (!row) { res.writeHead(404); return res.end(); }
  const data = Buffer.from(row.data);
  res.writeHead(200, { 'content-type': row.mime, 'content-length': data.length, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
  res.end(data);
}
