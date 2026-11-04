/* oddball platform API (everything under /api). All permissions are checked here, never in the browser. */
import crypto from 'node:crypto';
import { q, one, storageInfo } from './db.js';
import { createRouter, HttpError, bad, readJson, readBody, sendJson, clientIp, rateLimit, requireSameSite, clean, safeUrl, safeImage, safeDate } from './http.js';
import { register, login, startSession, endSession, currentUser, requireUser, requireAdmin, audit, checkPassword, validUsername } from './auth.js';
import { tiers, clearTierCache, membershipOf, entitlements, extendMembership, effectiveStatus } from './membership.js';
import { handleKofiWebhook, applyKofiEvent, kofiConfigured, bump } from './payments/kofi.js';
import { mailConfigured, sendMail } from './mail.js';
import { registerMacro, serveMacroImage } from './macro.js';

const GAMES = ['deadline-day', 'normal-form', 'tiny-nation', 'anti-scam', 'macro-micro'];
const LOWER_IS_BETTER = { 'normal-form': true }; // the form records time taken
const SLOTS = ['title', 'badge', 'theme', 'accent', 'decoration', 'trail'];
const SLOT_KIND = { title: 'title', badge: 'badge', theme: 'theme', accent: 'accent', decoration: 'decoration', trail: 'trail' };
const STATUSES = ['draft', 'preview', 'approved', 'active', 'disabled'];
const TRANSITIONS = { draft: ['preview'], preview: ['draft', 'approved'], approved: ['active', 'preview', 'draft'], active: ['disabled'], disabled: ['approved', 'draft'] };
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/* ---------- config ---------- */
async function getConfig() {
  const rows = await q('select key, value from config');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
async function setConfig(key, value) {
  await q('insert into config (key, value, updated_at) values ($1, $2, now()) on conflict (key) do update set value = excluded.value, updated_at = now()', [key, JSON.stringify(value)]);
}

/* ---------- products & profiles ---------- */
let productCache = null;
async function products() { if (!productCache) productCache = await q('select * from products order by sort, name'); return productCache; }
const clearProducts = () => { productCache = null; };

async function effectiveProfile(user, ents) {
  const prods = Object.fromEntries((await products()).map((p) => [p.id, p]));
  const stored = user.profile || {};
  const out = {};
  for (const slot of SLOTS) {
    const p = prods[stored[slot]];
    out[slot] = p && p.kind === SLOT_KIND[slot] && ents.check(p).usable ? { id: p.id, name: p.name, data: p.data } : null;
  }
  return out;
}
function publicCard(user, eff, membership) {
  return {
    username: user.username,
    title: eff.title ? eff.title.data.text : null,
    badge: eff.badge ? { name: eff.badge.name, ...eff.badge.data } : null,
    accent: eff.accent ? eff.accent.data.color : null,
    decoration: eff.decoration ? eff.decoration.data : null,
    theme: eff.theme ? eff.theme.data.theme : null,
    supporter: membership.access ? { tier: membership.tier, name: membership.tierName } : null,
  };
}

/* ---------- stats ---------- */
async function statsFor(userId, detailed) {
  const per = await q(`select game, count(*)::int as plays, max(score) as hi, min(score) as lo, max(at) as last from plays where user_id = $1 group by game`, [userId]);
  const recent = await q(`select game, score, won, meta, at from plays where user_id = $1 order by at desc limit 10`, [userId]);
  const total = per.reduce((t, r) => t + r.plays, 0);
  const games = per.map((r) => ({ game: r.game, plays: r.plays, best: LOWER_IS_BETTER[r.game] ? r.lo : r.hi, lowerIsBetter: !!LOWER_IS_BETTER[r.game], last: r.last }));
  const most = games.slice().sort((a, b) => b.plays - a.plays)[0] || null;
  const milestones = [
    { id: 'first', name: 'First game finished', done: total >= 1 },
    { id: 'ten', name: '10 games finished', done: total >= 10 },
    { id: 'fifty', name: '50 games finished', done: total >= 50 },
    { id: 'all', name: `Finished every game (${games.length}/${GAMES.length})`, done: games.length >= GAMES.length },
  ];
  const out = { total, games, mostPlayed: most ? most.game : null, recent, milestones, detailed: false };
  if (detailed) {
    out.detailed = true;
    out.activity = await q(`select to_char(date_trunc('day', at), 'YYYY-MM-DD') as day, count(*)::int as n from plays where user_id = $1 and at > now() - interval '30 days' group by 1 order by 1`, [userId]);
    out.history = await q(`select game, score, won, at from plays where user_id = $1 order by at desc limit 60`, [userId]);
  }
  return out;
}

/* ---------- promotions ---------- */
function promoItem(c, preview) {
  return {
    id: c.id, placement: c.placement_id, type: c.type, title: c.title, body: c.body, image: c.image,
    href: c.dest_url ? (preview ? c.dest_url : `/api/go/${c.id}`) : null, label: c.label, sponsored: c.sponsored,
    sponsor: c.sponsor_name || null, game: c.game_slug, desktop: c.desktop, mobile: c.mobile, width: c.width, height: c.height,
    status: c.status, sample: c.sample,
  };
}
async function promoFor(req, url) {
  const preview = url.searchParams.get('preview') === '1';
  const route = clean(url.searchParams.get('route') || 'home', 60);
  if (preview) await requireAdmin(req);
  const cfg = await getConfig();
  if (!preview && !cfg.monetization_enabled) return { live: false, preview: false, items: [] };
  const statuses = preview ? ['preview', 'approved', 'active'] : ['active'];
  const samples = !preview || url.searchParams.get('samples') !== '0';
  const show = preview && url.searchParams.get('show') != null ? new Set(url.searchParams.get('show').split(',').filter(Boolean)) : null;
  const rows = await q(`select c.*, p.type, p.desktop, p.mobile, p.width, p.height, p.enabled, s.name as sponsor_name
    from campaigns c join placements p on p.id = c.placement_id left join sponsors s on s.id = c.sponsor_id
    where c.status = any($1) and (c.end_at is null or c.end_at > now()) and ($2 or c.start_at is null or c.start_at <= now())
    order by c.updated_at desc`, [statuses, preview]);
  const ok = rows.filter((c) => (preview || c.enabled) && (samples || !c.sample) && (!show || show.has(c.placement_id)));
  const wanted = route === 'home' ? { footer: 1, home_sponsor: 1, sponsored_card: 2, gotw: 1 } : route.startsWith('game:') ? { game_sponsor: 1 } : {};
  const slug = route.startsWith('game:') ? route.slice(5) : null;
  const items = [];
  for (const [pid, max] of Object.entries(wanted)) {
    let list = ok.filter((c) => c.placement_id === pid && (pid !== 'game_sponsor' || c.game_slug === slug));
    if (!preview) list = list.sort(() => Math.random() - 0.5);
    items.push(...list.slice(0, max).map((c) => promoItem(c, preview)));
  }
  return { live: !preview, preview, items };
}

/* ---------- validation helpers ---------- */
const bool = (v) => v === true || v === 'true';
const intIn = (v, lo, hi, d = null) => { if (v == null || v === '') return d; const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < lo || n > hi) throw bad(`Number must be between ${lo} and ${hi}.`); return n; };
async function campaignInput(b, partial = {}) {
  const placement = b.placement_id ?? partial.placement_id;
  if (!(await one('select 1 from placements where id = $1', [placement]))) throw bad('Unknown placement.');
  const title = clean(b.title ?? partial.title, 80); if (!title) throw bad('Give it a title.');
  const game = b.game_slug ?? partial.game_slug ?? null;
  if (game && !GAMES.includes(game)) throw bad('Unknown game.');
  if ((placement === 'gotw' || placement === 'game_sponsor') && !game) throw bad('Pick which game this is for.');
  const start = safeDate(b.start_at ?? partial.start_at), end = safeDate(b.end_at ?? partial.end_at);
  if (start && end && new Date(end) <= new Date(start)) throw bad('The end date must be after the start date.');
  const dest = safeUrl(b.dest_url ?? partial.dest_url);
  if (placement !== 'gotw' && !dest) throw bad('Add the link people go to.');
  const sponsorId = b.sponsor_id ?? partial.sponsor_id ?? null;
  if (sponsorId && !(await one('select 1 from sponsors where id = $1', [sponsorId]))) throw bad('Unknown sponsor.');
  return {
    placement_id: placement, title, body: clean(b.body ?? partial.body ?? '', 200), image: safeImage(b.image ?? partial.image),
    dest_url: dest, label: clean(b.label ?? partial.label ?? 'Sponsored', 30) || 'Sponsored', game_slug: game,
    sponsored: b.sponsored == null ? (partial.sponsored ?? true) : bool(b.sponsored), start_at: start, end_at: end, sponsor_id: sponsorId,
  };
}

/* ---------- routes ---------- */
export function buildApi() {
  const r = createRouter();
  const ip = (req) => clientIp(req);

  /* auth */
  r.post('/api/auth/register', async (req, res) => {
    rateLimit(`reg:${ip(req)}`, 5, 60_000);
    const b = await readJson(req);
    const id = await register(b);
    await startSession(res, req, id);
    return { ok: true };
  });
  r.post('/api/auth/login', async (req, res) => {
    const b = await readJson(req);
    rateLimit(`login:${ip(req)}`, 10, 60_000); rateLimit(`login:u:${String(b.username || '').toLowerCase()}`, 10, 5 * 60_000);
    const id = await login(b);
    await startSession(res, req, id);
    return { ok: true };
  });
  r.post('/api/auth/logout', async (req, res) => { await endSession(req, res); return { ok: true }; });

  /* me */
  r.get('/api/me', async (req) => {
    const u = await currentUser(req);
    if (!u) return { user: null };
    const ents = await entitlements(u.id);
    const eff = await effectiveProfile(u, ents);
    return {
      user: { username: u.username, role: u.role, linkCode: u.link_code, publicCredits: u.public_credits, statsPublic: u.stats_public, featured: u.featured, createdAt: u.created_at },
      membership: ents.membership, profile: { stored: u.profile, effective: eff, card: publicCard(u, eff, ents.membership) }, owned: [...ents.owned],
    };
  });
  r.post('/api/me/settings', async (req) => {
    const u = await requireUser(req); const b = await readJson(req);
    await q('update users set public_credits = $1, stats_public = $2, updated_at = now() where id = $3', [bool(b.publicCredits ?? u.public_credits), bool(b.statsPublic ?? u.stats_public), u.id]);
    return { ok: true };
  });
  r.post('/api/me/profile', async (req) => {
    const u = await requireUser(req); const b = await readJson(req);
    const ents = await entitlements(u.id);
    const prods = Object.fromEntries((await products()).map((p) => [p.id, p]));
    const next = { ...(u.profile || {}) };
    for (const slot of SLOTS) {
      if (!(slot in b)) continue;
      const id = b[slot];
      if (id == null || id === '') { delete next[slot]; continue; }
      const p = prods[id];
      if (!p || p.kind !== SLOT_KIND[slot]) throw bad(`That isn’t a ${slot}.`);
      const st = ents.check(p);
      if (!st.usable) throw new HttpError(403, `You can’t use “${p.name}” yet. ${st.reason || ''}`.trim());
      next[slot] = id;
    }
    await q('update users set profile = $1, updated_at = now() where id = $2', [JSON.stringify(next), u.id]);
    return { ok: true };
  });
  r.post('/api/me/claim', async (req) => {
    const u = await requireUser(req); const b = await readJson(req);
    const p = (await products()).find((x) => x.id === b.productId);
    if (!p) throw bad('Unknown item.');
    const ents = await entitlements(u.id);
    const st = ents.check(p);
    if (!st.usable) throw new HttpError(403, st.reason || 'You can’t unlock that yet.');
    const source = !p.min_tier ? 'free' : p.data && p.data.milestone ? 'milestone' : 'membership';
    await q('insert into ownership (user_id, product_id, source) values ($1, $2, $3) on conflict do nothing', [u.id, p.id, source]);
    await bump('unlock', p.id);
    return { ok: true };
  });
  r.get('/api/me/stats', async (req) => {
    const u = await requireUser(req);
    const m = await membershipOf(u.id);
    return { ...(await statsFor(u.id, m.access && m.rank >= 2)), canSeeDetailed: m.access && m.rank >= 2 };
  });
  r.post('/api/me/delete', async (req, res) => {
    const u = await requireUser(req); const b = await readJson(req);
    if (!checkPassword(String(b.password || ''), u.pass_hash)) throw new HttpError(401, 'That password is wrong.');
    await audit(u.id, 'account.deleted', u.username);
    await q('delete from users where id = $1', [u.id]);
    await endSession(req, res);
    return { ok: true };
  });

  /* stats recording: only for signed-in players, only on known games */
  r.post('/api/stats/play', async (req) => {
    const u = await currentUser(req); if (!u) return { recorded: false };
    rateLimit(`play:${u.id}`, 30, 60_000);
    const b = await readJson(req);
    if (!GAMES.includes(b.game)) throw bad('Unknown game.');
    const score = b.score == null ? null : Number(b.score);
    if (score != null && (!Number.isFinite(score) || Math.abs(score) > 1e9)) throw bad('Bad score.');
    const meta = b.meta && typeof b.meta === 'object' ? b.meta : {};
    if (JSON.stringify(meta).length > 600) throw bad('Too much extra data.');
    await q('insert into plays (user_id, game, score, won, meta) values ($1, $2, $3, $4, $5)', [u.id, b.game, score, b.won == null ? null : !!b.won, JSON.stringify(meta)]);
    return { recorded: true };
  });

  /* vault */
  r.get('/api/vault', async (req) => {
    const u = await currentUser(req);
    const ents = await entitlements(u ? u.id : null);
    const stored = (u && u.profile) || {};
    const names = Object.fromEntries((await tiers()).map((t) => [t.id, t.name]));
    const items = (await products()).filter((p) => !p.archived || ents.owned.has(p.id)).map((p) => {
      const st = ents.check(p);
      return { id: p.id, name: p.name, category: p.category, kind: p.kind, description: p.description, minTier: p.min_tier, minTierName: p.min_tier ? names[p.min_tier] : 'Free', keep: p.keep, collection: p.collection, data: p.data, available: p.available, ...st, equipped: Object.values(stored).includes(p.id) && st.usable };
    });
    return { signedIn: !!u, membership: ents.membership, items, tiers: (await tiers()).filter((t) => t.active) };
  });

  /* support page, credits, public profiles, notes, advertise */
  r.get('/api/support', async (req) => {
    const cfg = await getConfig(); const site = cfg.site || {};
    const u = await currentUser(req);
    const out = {
      tiers: (await tiers()).filter((t) => t.active).map((t) => ({ id: t.id, name: t.name, rank: t.rank, price: t.price_cents, currency: t.currency, perks: t.perks })),
      payments: { ready: kofiConfigured() && !!site.kofi_url, provider: 'Ko-fi', url: site.kofi_url || null, manageUrl: site.kofi_manage_url || null, test: process.env.KOFI_TEST_MODE === '1' },
      coffee: { amounts: site.coffee_amounts || [3, 5, 10], url: site.kofi_url || null },
      newsletter: { open: mailConfigured() },
      contact: !!site.contact_email,
      me: null,
    };
    if (u) {
      const coffee = await one(`select received_at, amount_cents, currency from payment_events where user_id = $1 and type = 'Donation' and status = 'linked' order by received_at desc limit 1`, [u.id]);
      out.me = { username: u.username, linkCode: u.link_code, membership: await membershipOf(u.id), lastCoffee: coffee };
    }
    return out;
  });
  r.get('/api/credits', async () => {
    const rows = await q(`select u.* from users u join subscriptions s on s.user_id = u.id where u.public_credits group by u.id`);
    const out = [];
    for (const u of rows) {
      const ents = await entitlements(u.id);
      if (!ents.membership.access) continue;
      const eff = await effectiveProfile(u, ents);
      out.push({ ...publicCard(u, eff, ents.membership), featured: u.featured, rank: ents.membership.rank });
    }
    out.sort((a, b) => (b.featured - a.featured) || (b.rank - a.rank) || a.username.localeCompare(b.username));
    return { supporters: out };
  });
  r.get('/api/u/:name', async (req, res, params) => {
    const u = await one('select * from users where username_lc = $1', [String(params.name).toLowerCase()]);
    if (!u) throw new HttpError(404, 'No player with that name.');
    const ents = await entitlements(u.id);
    const eff = await effectiveProfile(u, ents);
    const card = publicCard(u, eff, ents.membership);
    if (!u.public_credits) card.supporter = null;
    return { profile: card, stats: u.stats_public ? await statsFor(u.id, false) : null };
  });
  r.get('/api/notes', async (req) => {
    const u = await currentUser(req);
    const m = u ? await membershipOf(u.id) : { access: false, rank: 0 };
    const rank = m.access ? m.rank : 0;
    const rankOf = Object.fromEntries((await tiers()).map((t) => [t.id, t.rank]));
    const all = await q('select * from dev_notes where published order by created_at desc');
    const visible = all.filter((n) => (n.min_tier ? rankOf[n.min_tier] : 0) <= rank);
    return { notes: visible.map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.created_at, tier: n.min_tier })), locked: all.length - visible.length };
  });
  r.get('/api/advertise', async () => {
    const cfg = await getConfig();
    const pl = await q('select id, name, type, description, width, height from placements where enabled order by id');
    const views = await one(`select coalesce(sum(n), 0)::int as n, min(day) as since from counters where kind = 'page' and day > current_date - 30`);
    return { placements: pl, audience: { pageViews30d: views.n, since: views.since }, contactEmail: (cfg.site || {}).contact_email || null };
  });

  /* promotions + privacy-friendly counters (no cookies, no ids, no IP storage) */
  r.get('/api/promo', async (req, res, params, url) => promoFor(req, url));
  r.post('/api/promo/seen', async (req) => {
    rateLimit(`seen:${ip(req)}`, 60, 60_000);
    const b = await readJson(req);
    const cfg = await getConfig(); if (!cfg.monetization_enabled) return { ok: true };
    const ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 6).filter((x) => /^[0-9a-f-]{36}$/.test(x));
    if (ids.length) { const act = await q(`select id from campaigns where id = any($1) and status = 'active'`, [ids]); for (const c of act) await bump('impression', c.id); }
    return { ok: true };
  });
  r.post('/api/track', async (req) => {
    rateLimit(`track:${ip(req)}`, 60, 60_000);
    const b = await readJson(req);
    const page = clean(b.page, 40);
    const okPage = ['home', 'support', 'vault', 'credits', 'advertise', 'me'].includes(page) || GAMES.some((g) => page === `game:${g}`);
    if (okPage) await bump('page', page);
    return { ok: true };
  });

  /* newsletter: explicit opt-in, confirmation email, unsubscribe. Hidden until email is configured. */
  r.post('/api/newsletter/subscribe', async (req, res, params, url) => {
    if (!mailConfigured()) throw new HttpError(503, 'The newsletter isn’t open yet.');
    rateLimit(`nl:${ip(req)}`, 5, 60_000);
    const b = await readJson(req);
    if (!bool(b.consent)) throw bad('Tick the box to say you want the newsletter.');
    const email = clean(b.email, 200).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('That email doesn’t look right.');
    const token = crypto.randomBytes(24).toString('base64url');
    const existing = await one('select status from newsletter_subscribers where email_lc = $1', [email]);
    if (existing && existing.status === 'confirmed') return { ok: true };
    if (existing) await q(`update newsletter_subscribers set token_hash = $2, status = 'pending', consent_at = now() where email_lc = $1`, [email, sha256(token)]);
    else await q(`insert into newsletter_subscribers (id, email_lc, status, token_hash, consent_at) values ($1, $2, 'pending', $3, now())`, [crypto.randomUUID(), email, sha256(token)]);
    const base = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    await sendMail({ to: email, subject: 'Confirm your oddball newsletter signup', text: `Someone (hopefully you) asked to get the oddball newsletter.\n\nConfirm: ${base}/newsletter?confirm=${token}\n\nNot you? Ignore this email and nothing happens.\nUnsubscribe any time: ${base}/newsletter?unsubscribe=${token}` });
    return { ok: true };
  });
  r.post('/api/newsletter/confirm', async (req) => {
    const b = await readJson(req);
    const rows = await q(`update newsletter_subscribers set status = 'confirmed', confirmed_at = now() where token_hash = $1 and status <> 'unsubscribed' returning id`, [sha256(String(b.token || ''))]);
    if (!rows.length) throw bad('That confirmation link isn’t valid any more.');
    return { ok: true };
  });
  r.post('/api/newsletter/unsubscribe', async (req) => {
    const b = await readJson(req);
    await q(`update newsletter_subscribers set status = 'unsubscribed' where token_hash = $1`, [sha256(String(b.token || ''))]);
    return { ok: true };
  });

  /* ---------- admin ---------- */
  r.post('/api/admin/bootstrap', async (req) => {
    const u = await requireUser(req); const b = await readJson(req);
    rateLimit(`boot:${ip(req)}`, 5, 10 * 60_000);
    const want = process.env.ADMIN_SETUP_TOKEN || '';
    const got = String(b.token || '');
    if (!want || want.length < 12) throw new HttpError(403, 'Admin setup is switched off. Set ADMIN_SETUP_TOKEN (12+ characters) on the server first.');
    if (await one(`select 1 from users where role = 'admin'`)) throw new HttpError(403, 'An admin already exists. Ask them to make you an admin.');
    if (got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) { await audit(u.id, 'admin.bootstrap_failed', u.username); throw new HttpError(403, 'Wrong setup token.'); }
    await q(`update users set role = 'admin' where id = $1`, [u.id]);
    await audit(u.id, 'admin.bootstrap', u.username);
    return { ok: true };
  });
  r.get('/api/admin/overview', async (req) => {
    await requireAdmin(req);
    const cfg = await getConfig();
    const byStatus = Object.fromEntries((await q(`select status, count(*)::int as n from campaigns where not sample group by status`)).map((x) => [x.status, x.n]));
    const samples = (await one(`select count(*)::int as n from campaigns where sample`)).n;
    const subs = await q('select * from subscriptions');
    const subCounts = {}; for (const s of subs) { const st = effectiveStatus(s); subCounts[st] = (subCounts[st] || 0) + 1; }
    const supporters = new Set(subs.filter((s) => ['active', 'past_due', 'cancelled'].includes(effectiveStatus(s)) && !s.test).map((s) => s.user_id)).size;
    const unmatched = (await one(`select count(*)::int as n from payment_events where status = 'unmatched'`)).n;
    const money = kofiConfigured() ? await q(`select currency, sum(amount_cents)::int as cents, count(*)::int as n from payment_events where not test and status in ('linked','received','unmatched') and received_at > now() - interval '30 days' group by currency`) : null;
    return {
      storage: storageInfo(), monetizationEnabled: !!cfg.monetization_enabled,
      payments: { provider: 'Ko-fi', configured: kofiConfigured(), testMode: process.env.KOFI_TEST_MODE === '1', pageSet: !!(cfg.site || {}).kofi_url },
      mail: mailConfigured(), campaigns: byStatus, samples, pendingApproval: byStatus.preview || 0,
      activeSponsorships: (await one(`select count(*)::int as n from campaigns where status = 'active' and not sample and (end_at is null or end_at > now())`)).n,
      supporters, subscriptions: subCounts, shopItems: (await one('select count(*)::int as n from products where not archived')).n,
      users: (await one('select count(*)::int as n from users')).n, unmatchedPayments: unmatched,
      recordedPayments30d: money, recent: await q(`select a.action, a.target, a.at, u.username from audit_log a left join users u on u.id = a.actor_id order by a.at desc limit 12`),
    };
  });
  r.post('/api/admin/config', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const cfg = await getConfig();
    if ('monetization_enabled' in b) { await setConfig('monetization_enabled', bool(b.monetization_enabled)); await audit(u.id, bool(b.monetization_enabled) ? 'ads.global_on' : 'ads.global_off', 'config'); }
    if (b.site) {
      const s = { ...(cfg.site || {}) };
      if ('contact_email' in b.site) { const e = clean(b.site.contact_email, 200); if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw bad('That email doesn’t look right.'); s.contact_email = e; }
      if ('kofi_url' in b.site) { const k = safeUrl(b.site.kofi_url); if (k && !/^https:\/\/(www\.)?ko-fi\.com\//.test(k)) throw bad('The Ko-fi link should start with https://ko-fi.com/'); s.kofi_url = k || ''; }
      if ('kofi_manage_url' in b.site) s.kofi_manage_url = safeUrl(b.site.kofi_manage_url) || '';
      if ('coffee_amounts' in b.site) s.coffee_amounts = (Array.isArray(b.site.coffee_amounts) ? b.site.coffee_amounts : []).map((n) => intIn(n, 1, 500)).slice(0, 5);
      await setConfig('site', s); await audit(u.id, 'config.site', 'config', s);
    }
    return { ok: true, config: await getConfig() };
  });
  r.get('/api/admin/config', async (req) => { await requireAdmin(req); return getConfig(); });

  /* placements & campaigns */
  r.get('/api/admin/placements', async (req) => { await requireAdmin(req); return { placements: await q('select * from placements order by id') }; });
  r.put('/api/admin/placements/:id', async (req, res, p) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const cur = await one('select * from placements where id = $1', [p.id]); if (!cur) throw new HttpError(404, 'No such placement.');
    await q('update placements set name = $2, enabled = $3, desktop = $4, mobile = $5, width = $6, height = $7, description = $8 where id = $1',
      [p.id, clean(b.name ?? cur.name, 60), bool(b.enabled ?? cur.enabled), bool(b.desktop ?? cur.desktop), bool(b.mobile ?? cur.mobile), intIn(b.width ?? cur.width, 50, 1200), intIn(b.height ?? cur.height, 20, 800), clean(b.description ?? cur.description, 200)]);
    await audit(u.id, 'placement.updated', p.id, b);
    return { ok: true };
  });
  r.get('/api/admin/campaigns', async (req) => {
    await requireAdmin(req);
    return { campaigns: await q(`select c.*, s.name as sponsor_name, (select coalesce(sum(n),0)::int from counters where kind='impression' and target = c.id::text) as impressions, (select coalesce(sum(n),0)::int from counters where kind='click' and target = c.id::text) as clicks from campaigns c left join sponsors s on s.id = c.sponsor_id order by c.sample, c.updated_at desc`) };
  });
  r.post('/api/admin/campaigns', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const v = await campaignInput(b);
    const id = crypto.randomUUID();
    await q(`insert into campaigns (id, placement_id, sponsor_id, status, title, body, image, dest_url, label, game_slug, sponsored, start_at, end_at, created_by) values ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, v.placement_id, v.sponsor_id, v.title, v.body, v.image, v.dest_url, v.label, v.game_slug, v.sponsored, v.start_at, v.end_at, u.id]);
    await audit(u.id, 'campaign.created', id, { title: v.title, placement: v.placement_id });
    return { ok: true, id };
  });
  r.put('/api/admin/campaigns/:id', async (req, res, p) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const cur = await one('select * from campaigns where id = $1', [p.id]); if (!cur) throw new HttpError(404, 'No such campaign.');
    const v = await campaignInput(b, cur);
    // editing something already approved sends it back for another look
    const status = ['approved', 'active'].includes(cur.status) ? 'preview' : cur.status;
    await q(`update campaigns set placement_id=$2, sponsor_id=$3, title=$4, body=$5, image=$6, dest_url=$7, label=$8, game_slug=$9, sponsored=$10, start_at=$11, end_at=$12, status=$13, updated_at=now(), approved_by = case when $13 = 'preview' then null else approved_by end where id = $1`,
      [p.id, v.placement_id, v.sponsor_id, v.title, v.body, v.image, v.dest_url, v.label, v.game_slug, v.sponsored, v.start_at, v.end_at, status]);
    await audit(u.id, 'campaign.edited', p.id, { backToPreview: status !== cur.status });
    return { ok: true, status };
  });
  r.post('/api/admin/campaigns/:id/status', async (req, res, p) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const cur = await one('select * from campaigns where id = $1', [p.id]); if (!cur) throw new HttpError(404, 'No such campaign.');
    const to = String(b.to || '');
    if (!STATUSES.includes(to) || !(TRANSITIONS[cur.status] || []).includes(to)) throw bad(`Can’t go from ${cur.status} to ${to}.`);
    if (to === 'active' && cur.sample) throw bad('Sample ads are for previews only and can’t go live.');
    await q(`update campaigns set status = $2, updated_at = now(), approved_by = case when $2 = 'approved' then $3::uuid else approved_by end, approved_at = case when $2 = 'approved' then now() else approved_at end where id = $1`, [p.id, to, u.id]);
    await audit(u.id, `campaign.${to}`, p.id, { from: cur.status, title: cur.title });
    return { ok: true };
  });
  r.del('/api/admin/campaigns/:id', async (req, res, p) => {
    const u = await requireAdmin(req);
    const cur = await one('select * from campaigns where id = $1', [p.id]); if (!cur) throw new HttpError(404, 'No such campaign.');
    if (cur.status !== 'draft' && !cur.sample) throw bad('Only drafts and samples can be deleted. Disable it instead.');
    await q('delete from campaigns where id = $1', [p.id]);
    await audit(u.id, 'campaign.deleted', p.id, { title: cur.title });
    return { ok: true };
  });

  /* sponsors */
  r.get('/api/admin/sponsors', async (req) => { await requireAdmin(req); return { sponsors: await q('select * from sponsors order by name') }; });
  r.post('/api/admin/sponsors', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const name = clean(b.name, 80); if (!name) throw bad('Sponsor needs a name.');
    const id = b.id || crypto.randomUUID();
    await q(`insert into sponsors (id, name, contact, website, notes) values ($1,$2,$3,$4,$5) on conflict (id) do update set name=$2, contact=$3, website=$4, notes=$5`, [id, name, clean(b.contact, 200), safeUrl(b.website), clean(b.notes, 1000)]);
    await audit(u.id, 'sponsor.saved', id, { name });
    return { ok: true, id };
  });
  r.del('/api/admin/sponsors/:id', async (req, res, p) => { const u = await requireAdmin(req); await q('delete from sponsors where id = $1', [p.id]); await audit(u.id, 'sponsor.deleted', p.id); return { ok: true }; });

  /* tiers & memberships */
  r.get('/api/admin/tiers', async (req) => { await requireAdmin(req); return { tiers: await q('select * from tiers order by rank') }; });
  r.put('/api/admin/tiers/:id', async (req, res, p) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const cur = await one('select * from tiers where id = $1', [p.id]); if (!cur) throw new HttpError(404, 'No such tier.');
    const perks = Array.isArray(b.perks) ? b.perks.map((x) => clean(x, 120)).filter(Boolean).slice(0, 10) : cur.perks;
    await q('update tiers set name=$2, price_cents=$3, currency=$4, perks=$5, provider_ref=$6, active=$7, updated_at=now() where id=$1',
      [p.id, clean(b.name ?? cur.name, 40), cur.rank === 0 ? 0 : intIn(b.price_cents ?? cur.price_cents, 0, 100000), clean(b.currency ?? cur.currency, 3).toUpperCase(), JSON.stringify(perks), clean(b.provider_ref ?? cur.provider_ref ?? '', 60) || null, cur.rank === 0 ? true : bool(b.active ?? cur.active)]);
    clearTierCache(); await audit(u.id, 'tier.updated', p.id, b);
    return { ok: true };
  });
  r.get('/api/admin/members', async (req) => {
    await requireAdmin(req);
    const rows = await q(`select s.*, u.username, t.name as tier_name from subscriptions s join users u on u.id = s.user_id join tiers t on t.id = s.tier_id order by s.updated_at desc limit 300`);
    return { members: rows.map((s) => ({ ...s, effective: effectiveStatus(s) })) };
  });
  r.post('/api/admin/members/grant', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const target = await one('select id, username from users where username_lc = $1', [String(b.username || '').toLowerCase()]); if (!target) throw bad('No user with that name.');
    const tier = await one('select id from tiers where id = $1 and rank > 0', [b.tier]); if (!tier) throw bad('Pick a paid tier.');
    const days = intIn(b.days, 1, 3660, 31);
    const note = clean(b.note, 200) || 'Granted by admin';
    await extendMembership(target.id, tier.id, 'manual', { days, note });
    await audit(u.id, 'membership.granted', target.username, { tier: tier.id, days, note });
    return { ok: true };
  });
  r.post('/api/admin/members/revoke', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const target = await one('select id, username from users where username_lc = $1', [String(b.username || '').toLowerCase()]); if (!target) throw bad('No user with that name.');
    const mode = b.immediate ? 'expired' : 'cancelled';
    await q(`update subscriptions set status = $2, current_period_end = case when $2 = 'expired' then now() else current_period_end end, updated_at = now() where user_id = $1 and ($3::text is null or provider = $3)`, [target.id, mode, b.provider || null]);
    await audit(u.id, 'membership.revoked', target.username, { mode, provider: b.provider || 'all' });
    return { ok: true };
  });
  r.get('/api/admin/events', async (req, res, p, url) => {
    await requireAdmin(req);
    const st = url.searchParams.get('status');
    const rows = await q(`select e.id, e.provider, e.event_id, e.type, e.status, e.amount_cents, e.currency, e.test, e.received_at, u.username, e.payload->>'from_name' as from_name, e.payload->>'tier_name' as tier_name, e.payload->>'message' as message
      from payment_events e left join users u on u.id = e.user_id where ($1::text is null or e.status = $1) order by e.received_at desc limit 200`, [st || null]);
    return { events: rows };
  });
  r.post('/api/admin/events/:id/link', async (req, res, p) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const ev = await one('select * from payment_events where id = $1', [p.id]); if (!ev) throw new HttpError(404, 'No such event.');
    if (ev.status === 'linked') throw bad('That payment is already linked.');
    const target = await one('select id, username from users where username_lc = $1', [String(b.username || '').toLowerCase()]); if (!target) throw bad('No user with that name.');
    const out = await applyKofiEvent(ev.id, target.id, ev.payload, u.id);
    await audit(u.id, 'payment.linked', ev.id, { user: target.username, result: out.status });
    return out;
  });

  /* vault products */
  r.get('/api/admin/products', async (req) => {
    await requireAdmin(req);
    return { products: await q(`select p.*, (select count(*)::int from ownership o where o.product_id = p.id) as owners from products p order by p.archived, p.sort, p.name`) };
  });
  r.post('/api/admin/products', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const id = clean(b.id, 60).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!id) throw bad('Products need an id like “title-sleepy”.');
    const kind = String(b.kind || '');
    if (!['title', 'badge', 'theme', 'accent', 'decoration', 'trail'].includes(kind)) throw bad('Unknown product type.');
    const cats = { title: 'titles', badge: 'badges', theme: 'themes', accent: 'accents', decoration: 'decorations', trail: 'trails' };
    const data = b.data && typeof b.data === 'object' ? b.data : {};
    if (kind === 'title') data.text = clean(data.text || b.name, 40);
    if (kind === 'accent' && !/^#[0-9a-f]{6}$/i.test(data.color || '')) throw bad('Accent colours look like #ff4d2e.');
    if (JSON.stringify(data).length > 1000) throw bad('Too much product data.');
    const tier = b.min_tier || null; if (tier && !(await one('select 1 from tiers where id = $1', [tier]))) throw bad('Unknown tier.');
    const name = clean(b.name, 60); if (!name) throw bad('Give it a name.');
    await q(`insert into products (id, name, category, kind, description, min_tier, keep, collection, data, available, archived, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11)
      on conflict (id) do update set name=$2, category=$3, kind=$4, description=$5, min_tier=$6, keep=$7, collection=$8, data=$9, available=$10, sort=$11, updated_at=now()`,
      [id, name, b.collection ? 'specials' : cats[kind], kind, clean(b.description, 200), tier, bool(b.keep), clean(b.collection, 40) || null, JSON.stringify(data), b.available == null ? true : bool(b.available), intIn(b.sort, 0, 9999, 500)]);
    clearProducts(); await audit(u.id, 'product.saved', id, { name });
    return { ok: true, id };
  });
  r.del('/api/admin/products/:id', async (req, res, p) => {
    const u = await requireAdmin(req);
    const owners = (await one('select count(*)::int as n from ownership where product_id = $1', [p.id])).n;
    // never delete something people own: retire it instead so nobody loses anything
    if (owners) await q('update products set archived = true, available = false, updated_at = now() where id = $1', [p.id]);
    else await q('delete from products where id = $1', [p.id]);
    clearProducts(); await audit(u.id, owners ? 'product.archived' : 'product.deleted', p.id, { owners });
    return { ok: true, archived: owners > 0 };
  });

  /* users / supporters */
  r.get('/api/admin/users', async (req, res, p, url) => {
    await requireAdmin(req);
    const s = `%${clean(url.searchParams.get('q') || '', 40).toLowerCase()}%`;
    return { users: await q(`select id, username, role, featured, public_credits, created_at from users where username_lc like $1 order by created_at desc limit 100`, [s]) };
  });
  r.post('/api/admin/users/:id', async (req, res, p) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const t = await one('select * from users where id = $1', [p.id]); if (!t) throw new HttpError(404, 'No such user.');
    if ('featured' in b) await q('update users set featured = $2 where id = $1', [p.id, bool(b.featured)]);
    if ('role' in b) {
      const role = b.role === 'admin' ? 'admin' : 'user';
      if (t.id === u.id && role !== 'admin') throw bad('You can’t remove your own admin role.');
      await q('update users set role = $2 where id = $1', [p.id, role]);
    }
    await audit(u.id, 'user.updated', t.username, b);
    return { ok: true };
  });

  /* newsletter admin (sponsor details; sending isn’t built until a mail service is set up and tested) */
  r.get('/api/admin/newsletter', async (req) => {
    await requireAdmin(req);
    const counts = Object.fromEntries((await q('select status, count(*)::int as n from newsletter_subscribers group by status')).map((x) => [x.status, x.n]));
    return { mail: mailConfigured(), counts, issues: await q('select * from newsletter_issues order by created_at desc') };
  });
  r.post('/api/admin/newsletter', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const subject = clean(b.subject, 120); if (!subject) throw bad('Give the issue a subject.');
    const id = b.id || crypto.randomUUID();
    await q(`insert into newsletter_issues (id, subject, status, sponsor_name, sponsor_text, sponsor_url, notes) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (id) do update set subject=$2, status=$3, sponsor_name=$4, sponsor_text=$5, sponsor_url=$6, notes=$7, updated_at=now()`,
      [id, subject, b.status === 'ready' ? 'ready' : 'draft', clean(b.sponsor_name, 80) || null, clean(b.sponsor_text, 200) || null, safeUrl(b.sponsor_url), clean(b.notes, 1000) || null]);
    await audit(u.id, 'newsletter.issue_saved', id, { subject });
    return { ok: true, id };
  });
  r.del('/api/admin/newsletter/:id', async (req, res, p) => { const u = await requireAdmin(req); await q('delete from newsletter_issues where id = $1', [p.id]); await audit(u.id, 'newsletter.issue_deleted', p.id); return { ok: true }; });

  /* dev notes */
  r.get('/api/admin/notes', async (req) => { await requireAdmin(req); return { notes: await q('select * from dev_notes order by created_at desc') }; });
  r.post('/api/admin/notes', async (req) => {
    const u = await requireAdmin(req); const b = await readJson(req);
    const title = clean(b.title, 120), body = String(b.body || '').slice(0, 8000);
    if (!title || !body.trim()) throw bad('Notes need a title and some text.');
    const tier = b.min_tier || null; if (tier && !(await one('select 1 from tiers where id = $1', [tier]))) throw bad('Unknown tier.');
    const id = b.id || crypto.randomUUID();
    await q(`insert into dev_notes (id, title, body, min_tier, published) values ($1,$2,$3,$4,$5) on conflict (id) do update set title=$2, body=$3, min_tier=$4, published=$5, updated_at=now()`, [id, title, body, tier, bool(b.published)]);
    await audit(u.id, 'note.saved', id, { title });
    return { ok: true, id };
  });
  r.del('/api/admin/notes/:id', async (req, res, p) => { const u = await requireAdmin(req); await q('delete from dev_notes where id = $1', [p.id]); await audit(u.id, 'note.deleted', p.id); return { ok: true }; });

  /* analytics & audit */
  r.get('/api/admin/analytics', async (req) => {
    await requireAdmin(req);
    const totals = await q(`select kind, target, sum(n)::int as n from counters where day > current_date - 30 group by kind, target order by kind, n desc`);
    const daily = await q(`select to_char(day, 'YYYY-MM-DD') as day, sum(n)::int as n from counters where kind = 'page' and day > current_date - 30 group by day order by day`);
    const visits = (await one(`select coalesce(sum(n),0)::int as n from counters where kind = 'page' and target = 'home'`)).n;
    return { totals, daily, homeVisitsAllTime: visits };
  });
  r.get('/api/admin/audit', async (req) => { await requireAdmin(req); return { log: await q(`select a.*, u.username from audit_log a left join users u on u.id = a.actor_id order by a.at desc limit 200`) }; });

  registerMacro(r);
  return r;
}

/* Entry point used by the platform server. */
export async function handleApi(router, req, res, url) {
  try {
    if (url.pathname === '/api/pay/kofi/webhook' && req.method === 'POST') {
      rateLimit(`kofi:${clientIp(req)}`, 120, 60_000);
      const out = await handleKofiWebhook(await readBody(req, 100_000));
      return sendJson(res, 200, { ok: true, ...out });
    }
    if (url.pathname.startsWith('/api/go/') && req.method === 'GET') {
      const id = url.pathname.slice(8);
      const cfg = (await one(`select value from config where key = 'monetization_enabled'`)) || { value: false };
      const c = /^[0-9a-f-]{36}$/.test(id) ? await one(`select * from campaigns where id = $1`, [id]) : null;
      if (c && c.status === 'active' && cfg.value === true && c.dest_url) { rateLimit(`go:${clientIp(req)}`, 30, 60_000); await bump('click', c.id); res.writeHead(302, { location: c.dest_url, 'cache-control': 'no-store' }); return res.end(); }
      res.writeHead(302, { location: '/' }); return res.end();
    }
    if (url.pathname.startsWith('/api/macro/img/') && req.method === 'GET') return serveMacroImage(req, res, url);
    const m = router.match(req.method, url.pathname);
    if (!m) return sendJson(res, 404, { error: 'Not found.' });
    if (req.method !== 'GET') requireSameSite(req);
    const out = await m.handler(req, res, m.params, url);
    return sendJson(res, 200, out ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
    console.error('api error', e);
    return sendJson(res, 500, { error: 'Something went wrong on our side.' });
  }
}
