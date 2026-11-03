# oddball monetization system

Everything is in **preview mode**. The global ads switch is **OFF**, and no payment can be taken until you finish the setup below.

## 1. What existed before (audit)

| Area | Before | Now |
|---|---|---|
| Frontend | React 18 + Vite, one page per game | Same, plus one new "site" app for account, support and admin pages |
| Backend | Node HTTP + WebSocket game rooms, all in memory | Same server, plus a JSON API under `/api` |
| Database | none | Postgres (`DATABASE_URL`), or embedded Postgres for local development |
| Accounts / profiles | none (names typed per game) | One account system: username + password, server-side sessions |
| Shop | browser-only themes and trails, unlocked by a code checked in the browser | Replaced by the **Supporter Vault**, where the server checks every unlock |
| Admin | none | `/admin` |
| Analytics | live player count only | Anonymous counters (no cookies, ids or IPs) |
| Game progress | stored in the browser | **Unchanged.** Nothing was migrated or touched |

## 2. Files

**New**
- `platform/server/db.js`, `migrations.js`, `http.js`, `auth.js`, `membership.js`, `seed.js`, `api.js`, `mail.js`
- `platform/server/payments/kofi.js`
- `platform/client/api.js`, `promo.jsx`, `themes.css`
- `platform/site/main.jsx`, `pages.jsx`, `admin.jsx`, `profile.jsx`, `site.css`
- `site/index.html`
- `docs/MONETIZATION.md`

**Changed**
- `platform/server/index.js`: mounts the API and the site routes
- `platform/hub/Hub.jsx`, `hub.css`, `main.jsx`: promotion slots, account chip, links
- `platform/client/cosmetics.js`: server-validated looks only
- `platform/site.config.js`: money settings moved to `/admin`
- `vite.config.js`, `package.json` (adds `pg` and `@electric-sql/pglite`)
- Each game's start screen (sponsor note) and end screen (stats for signed-in players): `games/*/client/…`

## 3. Database

Migrations are additive and versioned in the `schema_migrations` table. Each one runs once, inside a transaction, and nothing is ever dropped.

**Tables**
- `users`, `sessions`
- `config`
- `tiers`, `subscriptions`, `payment_events`
- `products`, `ownership`
- `sponsors`, `placements`, `campaigns`
- `counters`, `plays`
- `newsletter_subscribers`, `newsletter_issues`
- `dev_notes`
- `audit_log`

**Safety rules**
- `ownership → products` is `on delete restrict`. "Removing" an owned product retires it instead, so nobody loses anything.
- Deleting an account cascades to that account's own data only.
- Payment events are kept, with the user set to null.

**Back up before changing schemas:** with Neon or Supabase, use their point-in-time restore or `pg_dump`.

## 4. Security

**Accounts and sessions**
- Passwords are hashed with scrypt.
- Sessions are random 256-bit tokens, stored only as SHA-256 hashes, in an HttpOnly, SameSite=Lax, Secure cookie.
- The login response time doesn't reveal whether a username exists.

**Requests**
- Every state-changing request must carry the `x-oddball` header. Other sites can't send it, so this blocks CSRF.
- Rate limits apply to sign-up, login, webhooks, counters, the newsletter and stats.
- Links and images are validated: only http/https links, no `javascript:`, no SVG uploads, images limited to about 250 KB.

**Permissions**
- Admin role and membership live in the database only. The browser can't grant either (tested).
- Vault equipping and claiming are checked on the server against the current membership (tested).

**Payments**
- Webhooks are verified with a constant-time token comparison.
- Duplicates are dropped by a unique `(provider, event_id)` key (tested).

**Admin and privacy**
- Every admin action is written to the audit log.
- Public profiles and credits never include emails or payment data.

## 5. Features

| Feature | Where | Status |
|---|---|---|
| Footer ad, home sponsor line, sponsored game cards, Game of the Week, sponsored experiment note | Home page and game start screens | Built. Samples are in **Preview** |
| Draft → Preview → Approved → Active workflow | `/admin#ads` | Built. Editing an approved or active campaign sends it back to Preview |
| Global ads switch | `/admin#overview` | Built. **OFF** |
| Live preview: desktop, tablet, mobile, light/dark, toggles for each placement, before/after | `/admin#preview` | Built. Previews never count impressions or load third-party scripts |
| Support page, 4 configurable tiers, membership status and management | `/support` | Built. Join opens once Ko-fi is configured |
| Supporter Vault (53 items, filters, search, previews, unlock/equip) | `/vault` | Built |
| Profile customisation with live preview | `/me` | Built |
| Public profiles | `/u/<name>` | Built |
| Supporter credits with opt-out and featured supporters | `/supporters` | Built |
| Personal stats (games finished, bests, milestones); 30-day chart for Super and up | `/me` | Built. Recorded when a signed-in player finishes a game |
| Buy us a coffee | `/support#coffee`, home footer | Built. The thank-you only appears after a verified webhook |
| Newsletter: opt-in, confirmation email, unsubscribe, sponsor slots | `/support`, `/admin#newsletter` | Signup is hidden until email is configured. Sending issues is not built |
| Dev notes, optionally limited to supporters | `/notes`, `/admin#notes` | Built |
| Advertise page with measured audience only | `/advertise` | Built |
| Milestone badges (10k / 100k home visits) | Vault | Built. They unlock from the real counter |
| Analytics, labelled verified or estimated | `/admin#analytics` | Built |

**Rules for what you keep (shown to users):**
- **Titles and special badges** are yours to keep once unlocked.
- **Themes, decorations, colours, trails and tier badges** work only while you're subscribed. Your choices are remembered and come back if you rejoin.

## 6. Setup that needs you

Add these on Render under **Environment**:

| Variable | Why |
|---|---|
| `DATABASE_URL` | **Required for production.** Without it, data lives on Render's temporary disk and is lost on every deploy. Free options: Neon or Supabase Postgres. Paste their connection string. |
| `ADMIN_SETUP_TOKEN` | Any long random text. Sign up on the site, open `/admin`, and enter it to become the first admin. It only works while no admin exists. |
| `KOFI_VERIFICATION_TOKEN` | From Ko-fi → Settings → API → Webhooks. |
| `KOFI_TEST_MODE=1` | Optional, while testing with Ko-fi's "Send test" button. Remove it to go live. |
| `RESEND_API_KEY`, `MAIL_FROM` | Optional. Opens newsletter signups (confirmation emails go through Resend). |

**Payments.** Stripe doesn't accept merchant accounts from Oman, so oddball uses Ko-fi. Ko-fi hosts the checkout and pays out through PayPal or Stripe. Check that one of those works for whoever owns the account.

The Ko-fi account must be owned by an **adult** (or a business) who can pass Ko-fi's and PayPal's or Stripe's identity checks.

Ko-fi steps:
1. Create monthly membership tiers named exactly like the "Ko-fi tier name" column in `/admin#members`.
2. Set the webhook URL to `https://YOUR-SITE/api/pay/kofi/webhook`.
3. Put your Ko-fi page link in `/admin#settings`.

Ko-fi sends no cancellation webhook. A membership simply ends when the paid month runs out, plus a 3-day grace period. Payments that can't be matched to an account appear in `/admin#payments` for you to link.

## 7. Approving an ad

1. `/admin#ads` → **New campaign**. It starts as a Draft.
2. Click **Send to preview**, then check it in `/admin#preview` on all three device sizes and both themes, using **Before / after**.
3. Click **Approve**, then **Make active**.
4. Nothing shows to visitors until the global switch on `/admin#overview` is **on**.
5. Turning the switch off hides everything instantly.

Sample ads (Pixelmancer, Moth & Lamp, Ant Farm, Stapleworks) are fictional. They're for previews only and can't be made active. Delete them when you're done.

## 8. Tests run

**API security suite:** 81 of 81 passed (`/home/claude/apitest/test.mjs` during development). It covers:
- accounts, CSRF and admin protection
- forged, duplicate, renewal, unmatched and unknown-tier webhooks
- coffee thank-you only after verified payment
- Vault self-granting attempts
- cancellation, expiry and grace periods
- every ad workflow transition, the global switch, expired campaigns and sample lockout
- click and impression counting
- stats, privacy and account deletion

**Browser tests:**
- every page at 1366px and 390px with no console errors and no sideways scrolling
- every game still plays end to end

## 9. Known limitations

- **Password reset:** none without email. The admin can't see passwords. Users must remember theirs, or make a new account.
- **Newsletter sending:** issues can't be sent yet. Signups and sponsor slots work, and sending needs a tested mail setup first.
- **Who supports profile cosmetics:** only the oddball pages show them. In-game names (Deadline Day, Anti-Scam lobbies) don't show titles or badges yet.
- **Impressions are estimates:** they're reported by the browser. Clicks are verified on the server.
- **Single instance only:** rate limits and game rooms are in memory, so run one server.
- **No ad networks:** none are integrated, by design. Adding one would need a consent banner first.
