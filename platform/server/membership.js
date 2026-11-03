/* Membership: what a user is entitled to, computed on the server from subscription records. */
import crypto from 'node:crypto';
import { q, one } from './db.js';

export const GRACE_DAYS = 3;
const DAY = 86400_000;
let tierCache = null, tierAt = 0;
export async function tiers() {
  if (!tierCache || Date.now() - tierAt > 30_000) { tierCache = await q('select * from tiers order by rank'); tierAt = Date.now(); }
  return tierCache;
}
export const clearTierCache = () => { tierCache = null; };
export async function tierRank(id) { if (!id) return 0; const t = (await tiers()).find((x) => x.id === id); return t ? t.rank : 99; }

/** Status a subscription row really has right now. Ko-fi has no cancel webhook, so memberships run until the paid period ends. */
export function effectiveStatus(sub, now = Date.now()) {
  if (!sub) return 'free';
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
  if (sub.status === 'pending') return 'pending';
  if (sub.status === 'active') { if (end > now) return 'active'; if (now - end < GRACE_DAYS * DAY) return 'past_due'; return 'expired'; }
  if (sub.status === 'cancelled') return end > now ? 'cancelled' : 'expired';
  return sub.status; // expired, revoked
}
export const hasAccess = (status) => status === 'active' || status === 'past_due' || status === 'cancelled';

export async function membershipOf(userId) {
  const subs = await q('select s.*, t.name as tier_name, t.rank from subscriptions s join tiers t on t.id = s.tier_id where s.user_id = $1', [userId]);
  let best = null;
  for (const s of subs) {
    const status = effectiveStatus(s);
    const rec = { tier: s.tier_id, tierName: s.tier_name, rank: s.rank, status, endsAt: s.current_period_end, provider: s.provider, test: s.test, access: hasAccess(status) };
    if (!best || (rec.access && !best.access) || (rec.access === best.access && rec.rank > best.rank)) best = rec;
  }
  if (!best || !best.access) return { tier: 'free', tierName: 'Free', rank: 0, status: best ? best.status : 'free', endsAt: best ? best.endsAt : null, provider: best ? best.provider : null, test: false, access: false, previous: best || null };
  return best;
}

/** Grant or extend a membership. Used by verified webhooks and by audited admin actions only. */
export async function extendMembership(userId, tierId, provider, { days = 31, payerRef = null, test = false, note = null } = {}) {
  const existing = await one('select * from subscriptions where user_id = $1 and provider = $2', [userId, provider]);
  const now = Date.now();
  const base = existing && existing.current_period_end && new Date(existing.current_period_end).getTime() > now && existing.tier_id === tierId ? new Date(existing.current_period_end).getTime() : now;
  const end = new Date(base + days * DAY).toISOString();
  if (existing) {
    await q('update subscriptions set tier_id = $1, status = $2, current_period_end = $3, payer_ref = coalesce($4, payer_ref), test = $5, note = coalesce($6, note), updated_at = now() where id = $7', [tierId, 'active', end, payerRef, test, note, existing.id]);
  } else {
    await q('insert into subscriptions (id, user_id, tier_id, provider, status, current_period_end, payer_ref, test, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [crypto.randomUUID(), userId, tierId, provider, 'active', end, payerRef, test, note]);
  }
  return { firstTime: !existing || effectiveStatus(existing) === 'expired', end };
}

/** What a user may use from the Vault. Free items need an account; tier items need access at that tier;
 *  "keep" items stay usable once owned; milestone items also need the real visit count. */
export async function entitlements(userId) {
  const m = userId ? await membershipOf(userId) : { tier: 'free', rank: 0, access: false, status: 'free' };
  const owned = new Set(userId ? (await q('select product_id from ownership where user_id = $1', [userId])).map((r) => r.product_id) : []);
  const visits = Number((await one(`select coalesce(sum(n), 0)::int as n from counters where kind = 'page' and target = 'home'`)).n);
  const all = await tiers();
  const rankOf = Object.fromEntries(all.map((t) => [t.id, t.rank]));
  const nameOf = Object.fromEntries(all.map((t) => [t.id, t.name]));
  const check = (p) => {
    const isOwned = owned.has(p.id);
    if (!userId) return { usable: false, owned: false, reason: p.min_tier ? `Included with ${nameOf[p.min_tier]}.` : 'Free with an account.' };
    if (isOwned && p.keep) return { usable: true, owned: true };
    if (p.archived) return { usable: false, owned: isOwned, reason: 'This item has been retired.' };
    const milestone = p.data && p.data.milestone;
    if (milestone && visits < milestone) return { usable: false, owned: isOwned, reason: `Unlocks at ${milestone.toLocaleString('en-US')} home page visits (now ${visits.toLocaleString('en-US')}).` };
    if (!p.available) return { usable: false, owned: isOwned, reason: 'Not available right now.' };
    const need = p.min_tier ? rankOf[p.min_tier] ?? 99 : 0;
    if (need === 0 || (m.access && m.rank >= need)) return { usable: true, owned: isOwned };
    return { usable: false, owned: isOwned, reason: isOwned ? 'Usable again when your membership is active.' : `Included with ${nameOf[p.min_tier]}.` };
  };
  return { membership: m, owned, check, visits };
}
