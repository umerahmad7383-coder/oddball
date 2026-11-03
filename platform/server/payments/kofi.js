/* Ko-fi provider.
 * Ko-fi hosts the checkout (oddball never sees card details) and POSTs a webhook for every payment.
 * Setup: Ko-fi → Settings → API → Webhooks. Point it at https://YOUR-SITE/api/pay/kofi/webhook and copy the
 * verification token into the KOFI_VERIFICATION_TOKEN environment variable on the server.
 * Linking: supporters put their personal oddball code (e.g. ODD-K7Q2X) in the Ko-fi message.
 * Renewals then match on the payer email Ko-fi sends. Anything unmatched waits for an admin to link it. */
import crypto from 'node:crypto';
import { q, one } from '../db.js';
import { extendMembership, clearTierCache } from '../membership.js';
import { audit } from '../auth.js';
import { HttpError } from '../http.js';

export const kofiConfigured = () => !!process.env.KOFI_VERIFICATION_TOKEN;
const testMode = () => process.env.KOFI_TEST_MODE === '1';

function tokenOk(got) {
  const want = process.env.KOFI_VERIFICATION_TOKEN || '';
  const a = Buffer.from(String(got || '')), b = Buffer.from(want);
  return want.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Handles one webhook body (application/x-www-form-urlencoded with a `data` JSON field). */
export async function handleKofiWebhook(rawBody) {
  if (!kofiConfigured()) throw new HttpError(503, 'Ko-fi isn’t configured on this server.');
  let data;
  try { data = JSON.parse(new URLSearchParams(rawBody).get('data') || ''); } catch { throw new HttpError(400, 'Bad payload.'); }
  if (!data || !tokenOk(data.verification_token)) {
    await audit(null, 'payment.webhook_rejected', 'kofi', { reason: 'bad verification token' });
    throw new HttpError(401, 'Invalid verification token.');
  }
  const eventId = String(data.message_id || data.kofi_transaction_id || '').slice(0, 120);
  if (!eventId) throw new HttpError(400, 'Missing message id.');
  const type = String(data.type || 'Unknown');
  const amountCents = Math.round(Number(data.amount || 0) * 100) || null;
  const email = String(data.email || '').trim().toLowerCase().slice(0, 200) || null;
  const payload = { ...data, verification_token: undefined };
  const id = crypto.randomUUID();
  const inserted = await q(`insert into payment_events (id, provider, event_id, type, status, amount_cents, currency, payload, test)
                            values ($1, 'kofi', $2, $3, 'received', $4, $5, $6, $7) on conflict (provider, event_id) do nothing returning id`,
    [id, eventId, type, amountCents, String(data.currency || '').slice(0, 8) || null, JSON.stringify(payload), testMode()]);
  if (!inserted.length) return { duplicate: true };

  // Who is this? 1) their oddball code in the message, 2) an earlier linked payment from the same email
  const code = (String(data.message || '').toUpperCase().match(/ODD-[A-Z0-9]{5}/) || [])[0];
  let user = code ? await one('select id from users where link_code = $1', [code]) : null;
  if (!user && email) user = await one(`select user_id as id from subscriptions where provider = 'kofi' and payer_ref = $1`, [email]);
  if (!user && email) user = await one(`select user_id as id from payment_events where provider = 'kofi' and status = 'linked' and lower(payload->>'email') = $1 and user_id is not null limit 1`, [email]);
  return applyKofiEvent(id, user ? user.id : null, data, null);
}

/** Applies a stored Ko-fi event to a user (also used when an admin links an unmatched event). */
export async function applyKofiEvent(eventRowId, userId, data, adminId) {
  const email = String(data.email || '').trim().toLowerCase() || null;
  const isSub = data.type === 'Subscription' || data.is_subscription_payment === true || data.is_subscription_payment === 'true';
  if (!userId) {
    await q(`update payment_events set status = 'unmatched' where id = $1`, [eventRowId]);
    return { status: 'unmatched' };
  }
  if (isSub) {
    clearTierCache();
    const tier = await one('select id from tiers where active and lower(provider_ref) = lower($1) and rank > 0', [String(data.tier_name || '')]);
    if (!tier) {
      await q(`update payment_events set status = 'unmatched', user_id = $2 where id = $1`, [eventRowId, userId]);
      await audit(adminId, 'payment.unknown_tier', 'kofi', { tier_name: data.tier_name });
      return { status: 'unmatched', reason: 'unknown tier' };
    }
    const r = await extendMembership(userId, tier.id, 'kofi', { days: 31, payerRef: email, test: process.env.KOFI_TEST_MODE === '1' });
    await q(`update payment_events set status = 'linked', user_id = $2 where id = $1`, [eventRowId, userId]);
    if (r.firstTime) await bump('conversion', tier.id);
    await audit(adminId, 'membership.extended', userId, { tier: tier.id, until: r.end, via: adminId ? 'admin link' : 'webhook' });
    return { status: 'linked', membership: tier.id };
  }
  await q(`update payment_events set status = 'linked', user_id = $2 where id = $1`, [eventRowId, userId]);
  return { status: 'linked' };
}

export async function bump(kind, target, n = 1) {
  await q(`insert into counters (day, kind, target, n) values (current_date, $1, $2, $3)
           on conflict (day, kind, target) do update set n = counters.n + excluded.n`, [kind, String(target).slice(0, 80), n]);
}
