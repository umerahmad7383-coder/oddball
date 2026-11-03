import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Copy, Coffee, Search, ExternalLink, LogOut, Shield, Eye } from 'lucide-react';
import { api, track } from '../client/api.js';
import { applyCosmetics } from '../client/cosmetics.js';
import { ProfileCard, ItemPreview, BadgeIcon } from './profile.jsx';

const money = (cents, cur = 'USD') => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100); } catch (e) { return `$${(cents / 100).toFixed(2)}`; } };
const date = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const STATUS_TEXT = { active: 'Active', past_due: 'Payment late (you keep access for a few days)', cancelled: 'Cancelled, active until the end of the paid month', expired: 'Expired', pending: 'Waiting for payment', free: 'Free' };
const GAME_NAMES = { 'deadline-day': 'Deadline Day', 'normal-form': 'The Perfectly Normal Form', 'tiny-nation': 'Tiny Nation', 'anti-scam': 'Anti-Scam Arcade' };

export function useMe() {
  const [me, setMe] = useState(undefined);
  const load = () => api('/api/me').then((j) => setMe(j.user ? j : null)).catch(() => setMe(null));
  useEffect(() => { load(); }, []);
  return [me, load];
}
function Notice({ kind = 'info', children }) { return <div className={`notice ${kind}`}>{children}</div>; }
function useLoad(path, deps = []) {
  const [s, set] = useState({ data: null, error: null, loading: true });
  const reload = () => api(path).then((data) => set({ data, error: null, loading: false })).catch((e) => set({ data: null, error: e.message, loading: false }));
  useEffect(() => { reload(); }, deps);
  return [s, reload];
}
export function Loading() { return <p className="muted pad">Loading…</p>; }

/* ---------- sign in ---------- */
export function Login({ onDone, compact }) {
  const [mode, setMode] = useState('in');
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await api(mode === 'in' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: { username: u, password: p } });
      if (onDone) onDone(); else { const next = new URLSearchParams(window.location.search).get('next'); window.location.href = next && next.startsWith('/') ? next : '/me'; }
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className={`login ${compact ? 'compact' : ''}`} onSubmit={submit}>
      {!compact && <h1>{mode === 'in' ? 'Sign in' : 'Make an account'}</h1>}
      <p className="muted">{mode === 'in' ? 'Accounts are optional. Every game works without one.' : 'Just a name and a password. No email needed.'}</p>
      <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" maxLength={20} required /></label>
      <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={mode === 'in' ? 1 : 8} required /></label>
      {mode === 'up' && <small className="muted">At least 8 characters. There’s no password reset without email, so keep it somewhere safe.</small>}
      {err && <Notice kind="bad">{err}</Notice>}
      <button className="btn solid" disabled={busy}>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); }}>{mode === 'in' ? 'New here? Make an account' : 'Already have one? Sign in'}</button>
    </form>
  );
}

/* ---------- membership box (support + profile) ---------- */
function MembershipBox({ m, manageUrl, provider }) {
  if (!m) return null;
  const paid = m.tier !== 'free';
  return (
    <div className="membox">
      <div><small>Your membership</small><b>{m.tierName}{m.test ? ' (test)' : ''}</b><span className={`status s-${m.status}`}>{STATUS_TEXT[m.status] || m.status}</span></div>
      {paid && m.endsAt && <p className="muted">{m.status === 'active' ? 'Renews or ends' : 'Access until'} {date(m.endsAt)}. {m.provider === 'manual' ? 'Granted by oddball.' : ''}</p>}
      {!paid && m.previous && <p className="muted">Your {m.previous.tierName} membership ended {date(m.previous.endsAt)}. Titles you unlocked are still yours.</p>}
      {paid && m.provider === 'kofi' && manageUrl && <a className="btn" href={manageUrl} target="_blank" rel="noreferrer">Manage or cancel on {provider} <ExternalLink size={14} /></a>}
    </div>
  );
}

/* ---------- Support oddball ---------- */
export function Support() {
  const [s, reload] = useLoad('/api/support');
  const [joining, setJoining] = useState(null), [copied, setCopied] = useState(false), [amount, setAmount] = useState(null);
  useEffect(() => { track('support'); }, []);
  if (s.loading) return <Loading />;
  if (s.error) return <Notice kind="bad">{s.error}</Notice>;
  const d = s.data, me = d.me;
  const copy = async () => { try { await navigator.clipboard.writeText(me.linkCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { /* ignore */ } };
  const recentCoffee = me && me.lastCoffee && Date.now() - new Date(me.lastCoffee.received_at).getTime() < 14 * 86400_000;
  return (
    <div className="support">
      <header className="page-head">
        <h1>Support oddball</h1>
        <p>oddball is free, and the games stay free. Supporters pay for the server and for new experiments. In return you get some nice-looking extras for your profile. Nothing that helps you win.</p>
      </header>
      {d.payments.test && <Notice kind="warn">Payments are in <b>test mode</b>. Nothing here takes real money.</Notice>}
      {!d.payments.ready && <Notice>Memberships open soon. Payments aren’t set up yet, so nothing can be bought today.</Notice>}
      {me && <MembershipBox m={me.membership} manageUrl={d.payments.manageUrl} provider={d.payments.provider} />}

      <section className="tiers">
        {d.tiers.map((t) => {
          const current = me && me.membership.tier === t.id && me.membership.access;
          return (
            <div key={t.id} className={`tier ${current ? 'current' : ''} r${t.rank}`}>
              <h2>{t.name}</h2>
              <p className="price">{t.price ? <>{money(t.price, t.currency)}<small>/month</small></> : 'Free'}</p>
              <ul>{t.perks.map((x) => <li key={x}><Check size={15} /> {x}</li>)}</ul>
              {t.rank === 0 ? (me ? <span className="muted small">That’s you.</span> : <a className="btn" href="/login?next=/support">Make an account</a>)
                : current ? <span className="tag-on"><Check size={14} /> Your tier</span>
                  : me && me.membership.access && me.membership.rank > t.rank ? <span className="muted small">Included in your tier</span>
                  : !d.payments.ready ? <button className="btn" disabled>Not open yet</button>
                    : !me ? <a className="btn solid" href="/login?next=/support">Sign in to join</a>
                      : <button className="btn solid" onClick={() => setJoining(t)}>Join as {t.name}</button>}
            </div>
          );
        })}
      </section>

      {joining && me && (
        <section className="howto" aria-live="polite">
          <h3>Joining as {joining.name}</h3>
          <ol>
            <li>Copy your code: <button className="code" onClick={copy}>{me.linkCode} <Copy size={14} /></button> {copied && <span className="muted small">Copied</span>}</li>
            <li>Open {d.payments.provider} and choose the <b>{joining.name}</b> membership.</li>
            <li>Paste your code into the message box, so we know it’s you.</li>
          </ol>
          <p className="muted">Your membership shows up here as soon as {d.payments.provider} confirms the payment, usually within a minute. Nothing changes on our side until then.</p>
          <div className="row"><a className="btn solid" href={d.payments.url} target="_blank" rel="noreferrer">Open {d.payments.provider} <ExternalLink size={14} /></a><button className="btn" onClick={reload}>I’ve paid, check again</button></div>
        </section>
      )}

      <section className="coffee-box" id="coffee">
        <h2><Coffee size={20} /> Buy us a coffee</h2>
        <p className="muted">A one-off thank you. It doesn’t unlock anything, it just makes us happy.</p>
        {recentCoffee && <Notice kind="good">Thanks for the coffee on {date(me.lastCoffee.received_at)}! It arrived.</Notice>}
        <div className="row">{d.coffee.amounts.map((a) => <button key={a} className={`chip ${amount === a ? 'on' : ''}`} onClick={() => setAmount(a)}>${a}</button>)}</div>
        {d.coffee.url ? (
          <p className="muted small">{amount ? `You’ll pick $${amount} on ${d.payments.provider}. ` : ''}{me ? <>Add <b>{me.linkCode}</b> to your message if you’d like us to know it was you.</> : 'Sign in first if you’d like a thank-you here.'}</p>
        ) : null}
        {d.coffee.url ? <a className="btn solid" href={d.coffee.url} target="_blank" rel="noreferrer">Buy a coffee on {d.payments.provider} <ExternalLink size={14} /></a> : <button className="btn" disabled>Coffee isn’t set up yet</button>}
      </section>

      {d.newsletter.open && <Newsletter />}

      <section className="rules">
        <h2>The small print, in plain words</h2>
        <ul>
          <li>Memberships are monthly. You can stop any time on {d.payments.provider}. You keep everything until the month you paid for ends.</li>
          <li>Titles and some special badges are <b>yours to keep</b> once you’ve unlocked them, even if you stop.</li>
          <li>Themes, decorations, colours, trails and tier badges work <b>while you’re subscribed</b>. They come back if you rejoin.</li>
          <li>Nothing here changes how any game plays. Every game is free for everyone.</li>
          <li>We never see your card details. {d.payments.provider} handles the payment.</li>
        </ul>
        <p className="muted"><a className="link" href="/supporters">See the supporters</a> · <a className="link" href="/vault">Browse the Vault</a></p>
      </section>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState(''), [consent, setConsent] = useState(false), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api('/api/newsletter/subscribe', { method: 'POST', body: { email, consent } }); setMsg({ kind: 'good', text: 'Check your inbox and click the link to confirm.' }); }
    catch (x) { setMsg({ kind: 'bad', text: x.message }); } finally { setBusy(false); }
  };
  return (
    <section className="newsletter" id="newsletter">
      <h2>The occasional newsletter</h2>
      <p className="muted">New games and what we’re building. Maybe once a month. Your email is never shared with anyone, sponsors included.</p>
      <form onSubmit={go} className="row">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required aria-label="Email" />
        <button className="btn solid" disabled={busy}>Sign up</button>
      </form>
      <label className="check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Yes, email me the oddball newsletter. I can unsubscribe any time.</label>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
    </section>
  );
}

/* ---------- Supporter Vault ---------- */
const CATS = [['all', 'Everything'], ['titles', 'Titles'], ['badges', 'Badges'], ['themes', 'Themes'], ['decorations', 'Decorations'], ['accents', 'Colours'], ['trails', 'Cursor trails'], ['specials', 'Collections']];
const SLOT_OF = { title: 'title', badge: 'badge', theme: 'theme', accent: 'accent', decoration: 'decoration', trail: 'trail' };
export function Vault() {
  const [s, reload] = useLoad('/api/vault');
  const [cat, setCat] = useState('all'), [term, setTerm] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(null), [peek, setPeek] = useState(null);
  const [me] = useMe();
  useEffect(() => { track('vault'); }, []);
  const items = useMemo(() => {
    if (!s.data) return [];
    const t = term.trim().toLowerCase();
    return s.data.items.filter((i) => (cat === 'all' || i.category === cat) && (!t || `${i.name} ${i.description} ${i.collection || ''}`.toLowerCase().includes(t)));
  }, [s.data, cat, term]);
  if (s.loading) return <Loading />;
  if (s.error) return <Notice kind="bad">{s.error}</Notice>;
  const d = s.data;
  const act = async (item, equip) => {
    setBusy(item.id); setErr('');
    try {
      if (equip && item.keep && !item.owned) await api('/api/me/claim', { method: 'POST', body: { productId: item.id } });
      await api('/api/me/profile', { method: 'POST', body: { [SLOT_OF[item.kind]]: equip ? item.id : null } });
      await reload();
      if (item.kind === 'theme' || item.kind === 'trail') { const m = await api('/api/me'); const eff = m.profile.effective; applyCosmetics({ theme: eff.theme && eff.theme.data.theme, trail: eff.trail && eff.trail.data.trail }); }
    } catch (x) { setErr(x.message); } finally { setBusy(null); }
  };
  const groups = cat === 'specials' ? [...new Set(items.map((i) => i.collection || 'Other'))] : null;
  const grid = (list) => (
    <div className="vault-grid">
      {list.map((it) => (
        <article key={it.id} className={`vitem ${it.usable ? 'open' : 'locked'} ${it.equipped ? 'equipped' : ''}`}>
          <button className="vprev" onClick={() => setPeek(it)} aria-label={`Preview ${it.name}`}><ItemPreview item={it} base={me && me.user ? me.user.username : 'you'} /></button>
          <div className="vbody">
            <h3>{it.name}</h3>
            <p>{it.description}</p>
            <div className="vmeta"><span className={`req r-${it.minTier || 'free'}`}>{it.minTierName}</span>{it.minTier && <span className="muted small">{it.keep ? 'Yours to keep' : 'While subscribed'}</span>}</div>
            {!d.signedIn ? <a className="btn small" href="/login?next=/vault">Sign in to use</a>
              : it.usable ? (it.equipped ? <button className="btn small" disabled={busy === it.id} onClick={() => act(it, false)}><Check size={14} /> Equipped · take off</button>
                : <button className="btn small solid" disabled={busy === it.id} onClick={() => act(it, true)}>{it.minTier && it.keep && !it.owned ? 'Unlock & use' : 'Use this'}</button>)
                : <p className="lockmsg"><Lock size={13} /> {it.reason}</p>}
          </div>
        </article>
      ))}
    </div>
  );
  return (
    <div className="vault">
      <header className="page-head">
        <h1>Supporter Vault</h1>
        <p>Titles, badges, themes and other cosmetics for your profile. Looks only. Nothing here helps in any game.</p>
        <p className="muted">{d.signedIn ? <>You’re on <b>{d.membership.tierName || 'Free'}</b>.{!d.membership.access && <> Free items work for everyone. <a className="link" href="/support">Become a supporter</a> for the rest.</>}</> : <>Browse freely. <a className="link" href="/login?next=/vault">Sign in</a> to use things.</>}</p>
      </header>
      <div className="vault-tools">
        <div className="chips">{CATS.map(([k, l]) => <button key={k} className={`chip ${cat === k ? 'on' : ''}`} onClick={() => setCat(k)}>{l}</button>)}</div>
        <label className="search"><Search size={16} /><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search the Vault" aria-label="Search the Vault" /></label>
      </div>
      {err && <Notice kind="bad">{err}</Notice>}
      {items.length === 0 ? <p className="muted pad">Nothing matches that.</p> : groups ? groups.map((g) => <div key={g}><h2 className="group">{g}</h2>{grid(items.filter((i) => (i.collection || 'Other') === g))}</div>) : grid(items)}
      {peek && (
        <div className="modal" onClick={() => setPeek(null)} role="dialog" aria-label={`Preview of ${peek.name}`}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{peek.name}</h3>
            <PreviewWith me={me} item={peek} />
            <p className="muted">{peek.description} {peek.kind === 'trail' ? 'Move your mouse around the page once it’s on.' : ''}</p>
            <button className="btn" onClick={() => setPeek(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
function PreviewWith({ me, item }) {
  const base = me && me.profile ? { ...me.profile.card } : { username: 'you', title: null, badge: null, accent: null, decoration: null, theme: null };
  if (item.kind === 'title') base.title = item.data.text;
  if (item.kind === 'badge') base.badge = { name: item.name, ...item.data };
  if (item.kind === 'accent') base.accent = item.data.color;
  if (item.kind === 'decoration') base.decoration = item.data;
  if (item.kind === 'theme') base.theme = item.data.theme;
  if (item.kind === 'trail') return <ItemPreview item={item} />;
  return <ProfileCard card={base} />;
}

/* ---------- my profile ---------- */
export function Me() {
  const [me, reloadMe] = useMe();
  const [vault, reloadVault] = useLoad('/api/vault');
  const [stats] = useLoad('/api/me/stats', [me && me.user && me.user.username]);
  const [sup] = useLoad('/api/support');
  const [draft, setDraft] = useState(null), [msg, setMsg] = useState(null), [del, setDel] = useState(false), [pw, setPw] = useState('');
  useEffect(() => { if (me) setDraft({ ...(me.profile.stored || {}) }); }, [me]);
  useEffect(() => { track('me'); }, []);
  if (me === undefined) return <Loading />;
  if (me === null) return <div className="narrow"><Login onDone={() => { window.location.href = '/me'; }} /></div>;
  const usable = vault.data ? vault.data.items.filter((i) => i.usable) : [];
  const byId = Object.fromEntries((vault.data ? vault.data.items : []).map((i) => [i.id, i]));
  const card = { ...me.profile.card };
  if (draft) {
    const g = (slot) => byId[draft[slot]];
    card.title = g('title') ? g('title').data.text : null;
    card.badge = g('badge') ? { name: g('badge').name, ...g('badge').data } : null;
    card.accent = g('accent') ? g('accent').data.color : null;
    card.decoration = g('decoration') ? g('decoration').data : null;
    card.theme = g('theme') ? g('theme').data.theme : null;
  }
  const changed = draft && JSON.stringify(draft) !== JSON.stringify(me.profile.stored || {});
  const save = async () => {
    setMsg(null);
    try {
      const body = {}; for (const slot of Object.values(SLOT_OF)) body[slot] = draft[slot] || null;
      for (const slot of Object.keys(body)) { const it = byId[body[slot]]; if (it && it.keep && !it.owned) await api('/api/me/claim', { method: 'POST', body: { productId: it.id } }); }
      await api('/api/me/profile', { method: 'POST', body });
      const m = await api('/api/me'); const eff = m.profile.effective;
      applyCosmetics({ theme: eff.theme && eff.theme.data.theme, trail: eff.trail && eff.trail.data.trail });
      await reloadMe(); await reloadVault(); setMsg({ kind: 'good', text: 'Saved.' });
    } catch (x) { setMsg({ kind: 'bad', text: x.message }); }
  };
  const setting = async (k, v) => { await api('/api/me/settings', { method: 'POST', body: { [k]: v } }); reloadMe(); };
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; };
  const remove = async () => { try { await api('/api/me/delete', { method: 'POST', body: { password: pw } }); window.location.href = '/'; } catch (x) { setMsg({ kind: 'bad', text: x.message }); } };
  const slotLabel = { title: 'Title', badge: 'Badge', theme: 'Theme', accent: 'Accent colour', decoration: 'Decoration', trail: 'Cursor trail' };
  return (
    <div className="me">
      <header className="page-head row-between">
        <h1>Hello, {me.user.username}</h1>
        <div className="row">{me.user.role === 'admin' && <a className="btn" href="/admin"><Shield size={15} /> Admin</a>}<a className="btn" href={`/u/${me.user.username}`}><Eye size={15} /> Public profile</a><button className="btn" onClick={logout}><LogOut size={15} /> Sign out</button></div>
      </header>
      <section className="editor">
        <div className="editor-prev"><ProfileCard card={card} /><small className="muted">Preview. Nothing changes until you save.</small></div>
        <div className="editor-form">
          {Object.entries(slotLabel).map(([slot, label]) => (
            <label key={slot}>{label}
              <select value={(draft && draft[slot]) || ''} onChange={(e) => setDraft({ ...draft, [slot]: e.target.value || undefined })}>
                <option value="">None</option>
                {usable.filter((i) => SLOT_OF[i.kind] === slot).map((i) => <option key={i.id} value={i.id}>{i.name}{i.minTier ? ` (${i.minTierName})` : ''}</option>)}
              </select>
            </label>
          ))}
          <div className="row"><button className="btn solid" disabled={!changed} onClick={save}>Save profile</button><button className="btn" disabled={!changed} onClick={() => setDraft({ ...(me.profile.stored || {}) })}>Undo changes</button></div>
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          <p className="muted small">Only things you’re allowed to use are listed. More in the <a className="link" href="/vault">Vault</a>.</p>
        </div>
      </section>
      <MembershipBox m={me.membership} manageUrl={sup.data && sup.data.payments.manageUrl} provider={sup.data ? sup.data.payments.provider : 'Ko-fi'} />
      <section className="settings">
        <h2>Privacy</h2>
        <label className="check"><input type="checkbox" checked={me.user.publicCredits} onChange={(e) => setting('publicCredits', e.target.checked)} /> Show me on the supporters page when I’m a supporter</label>
        <label className="check"><input type="checkbox" checked={me.user.statsPublic} onChange={(e) => setting('statsPublic', e.target.checked)} /> Show my game stats on my public profile</label>
        <p className="muted small">Your supporter code is <b>{me.user.linkCode}</b>. Put it in your Ko-fi message so payments find your account.</p>
      </section>
      <Stats s={stats} />
      <section className="danger">
        {!del ? <button className="link" onClick={() => setDel(true)}>Delete my account</button> : (
          <div className="row"><input type="password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Password to confirm" /><button className="btn bad" onClick={remove}>Delete forever</button><button className="btn" onClick={() => setDel(false)}>Keep it</button></div>
        )}
        <p className="muted small">Deleting removes your account, profile and stats. Ko-fi memberships must be cancelled on Ko-fi.</p>
      </section>
    </div>
  );
}

function Stats({ s }) {
  if (s.loading) return <Loading />;
  if (s.error || !s.data) return null;
  const d = s.data;
  // all 30 days, so quiet days show as gaps instead of one stretched bar
  const days = d.activity ? Array.from({ length: 30 }, (_, i) => { const dt = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10); const hit = d.activity.find((a) => a.day === dt); return { day: dt, n: hit ? hit.n : 0 }; }) : [];
  const max = Math.max(1, ...days.map((a) => a.n));
  return (
    <section className="stats">
      <h2>Your stats</h2>
      <p className="muted small">Recorded when you finish a game while signed in. Nothing is guessed.</p>
      {d.total === 0 ? <p className="muted">No finished games yet. Go play something!</p> : (
        <>
          <div className="statrow"><div><b>{d.total}</b><small>games finished</small></div><div><b>{GAME_NAMES[d.mostPlayed] || '—'}</b><small>most played</small></div></div>
          <table className="tbl"><thead><tr><th>Game</th><th>Finished</th><th>Best</th><th>Last played</th></tr></thead>
            <tbody>{d.games.map((g) => <tr key={g.game}><td>{GAME_NAMES[g.game] || g.game}</td><td>{g.plays}</td><td>{g.best == null ? '—' : g.lowerIsBetter ? `${Math.round(g.best)}s` : Math.round(g.best).toLocaleString()}</td><td>{date(g.last)}</td></tr>)}</tbody></table>
        </>
      )}
      <ul className="miles">{d.milestones.map((m) => <li key={m.id} className={m.done ? 'done' : ''}>{m.done ? <Check size={14} /> : <Lock size={14} />} {m.name}</li>)}</ul>
      {d.detailed ? (
        <div className="activity"><h3>Last 30 days</h3>{d.activity.length === 0 ? <p className="muted">Nothing yet.</p> : <div className="bars" aria-label="Games finished per day, last 30 days">{days.map((a) => <span key={a.day} title={`${a.day}: ${a.n}`} style={{ height: `${Math.max(a.n ? 8 : 2, (a.n / max) * 100)}%`, opacity: a.n ? 1 : 0.25 }} />)}</div>}</div>
      ) : <p className="muted small">Super Supporters also get a 30-day activity chart and full history.</p>}
    </section>
  );
}

/* ---------- supporters, public profile, notes, advertise, privacy, newsletter ---------- */
export function Supporters() {
  const [s] = useLoad('/api/credits');
  useEffect(() => { track('credits'); }, []);
  if (s.loading) return <Loading />;
  const list = s.data ? s.data.supporters : [];
  return (
    <div>
      <header className="page-head"><h1>People keeping oddball weird.</h1><p>Thank you. Seriously.</p></header>
      {list.length === 0 ? <p className="muted pad">No public supporters yet. <a className="link" href="/support">Could be you.</a></p>
        : <div className="credits">{list.map((c) => <a key={c.username} href={`/u/${c.username}`} className={c.featured ? 'featured' : ''}><ProfileCard card={c} compact /></a>)}</div>}
      <p className="muted small">Supporters can hide themselves from this page in their profile settings.</p>
    </div>
  );
}
export function PublicProfile({ name }) {
  const [s] = useLoad(`/api/u/${encodeURIComponent(name)}`, [name]);
  if (s.loading) return <Loading />;
  if (s.error) return <Notice kind="bad">{s.error}</Notice>;
  return (
    <div className="narrow">
      <ProfileCard card={s.data.profile} />
      {s.data.stats ? <Stats s={{ data: s.data.stats, loading: false }} /> : <p className="muted pad">{s.data.profile.username} keeps their stats private.</p>}
    </div>
  );
}
export function Notes() {
  const [s] = useLoad('/api/notes');
  if (s.loading) return <Loading />;
  const d = s.data || { notes: [], locked: 0 };
  return (
    <div className="narrow">
      <header className="page-head"><h1>Dev notes</h1><p>What we’re building, and why.</p></header>
      {d.notes.length === 0 && <p className="muted">No notes yet.</p>}
      {d.notes.map((n) => <article key={n.id} className="note"><h2>{n.title}</h2><time className="muted small">{date(n.at)}{n.tier ? ' · supporters' : ''}</time><p>{n.body}</p></article>)}
      {d.locked > 0 && <p className="muted"><Lock size={14} /> {d.locked} more note{d.locked > 1 ? 's are' : ' is'} for supporters. <a className="link" href="/support">Become one</a>.</p>}
    </div>
  );
}
export function Advertise() {
  const [s] = useLoad('/api/advertise');
  useEffect(() => { track('advertise'); }, []);
  if (s.loading) return <Loading />;
  const d = s.data;
  return (
    <div className="narrow">
      <header className="page-head"><h1>Advertise with oddball</h1><p>A few small, clearly labelled spots. No pop-ups, no autoplay, no tracking your visitors.</p></header>
      <h2>Where things can go</h2>
      <ul className="places">{d.placements.map((p) => <li key={p.id}><b>{p.name}</b><span className="muted">{p.description}</span></li>)}</ul>
      <h2>Audience</h2>
      {d.audience.pageViews30d > 0
        ? <p>{d.audience.pageViews30d.toLocaleString()} page views in the last 30 days, counted by oddball’s own anonymous counter (no cookies) since {date(d.audience.since)}.</p>
        : <p className="muted">We haven’t collected enough visit data to share numbers yet. We’ll only ever publish what we’ve actually measured.</p>}
      <h2>Rules we keep</h2>
      <ul><li>Everything paid is labelled.</li><li>Sponsored games stay free to play.</li><li>Sponsors never change a game without our say-so.</li><li>We don’t share anything about our visitors or subscribers.</li></ul>
      <h2>Get in touch</h2>
      {d.contactEmail ? <a className="btn solid" href={`mailto:${d.contactEmail}?subject=Advertising%20on%20oddball`}>Email {d.contactEmail}</a> : <p className="muted">Contact details are coming soon.</p>}
    </div>
  );
}
export function Privacy() {
  return (
    <div className="narrow prose">
      <h1>Privacy</h1>
      <p>Short version: we keep as little as we can, and we never sell it.</p>
      <h2>Without an account</h2>
      <p>You can play every game without signing up. Games remember your best scores in your own browser. We count page visits with an anonymous counter that uses no cookies and stores no IP addresses or ids.</p>
      <h2>With an account</h2>
      <p>We store your username, a scrambled version of your password, your profile choices, and the games you finish while signed in. One cookie keeps you signed in. You can delete your account and all of this from your profile page.</p>
      <h2>Payments</h2>
      <p>Memberships and coffees are paid on Ko-fi. We never see card details. Ko-fi tells us the payment happened, the amount, the tier and the payer’s email, which we use only to match renewals to your account.</p>
      <h2>Newsletter</h2>
      <p>Only if you sign up and confirm by email. You can unsubscribe from any email. Sponsors in the newsletter never get your address.</p>
      <h2>Ads and sponsors</h2>
      <p>Any ads are bought directly and shown the same to everyone. We don’t use ad networks, so no ad tracking happens here. Clicking a sponsored link adds one to an anonymous click counter. If we ever add an ad network, we’ll ask you first and update this page.</p>
      <p className="muted small">Last updated 3 November 2026.</p>
    </div>
  );
}
export function NewsletterPage() {
  const sp = new URLSearchParams(window.location.search);
  const [msg, setMsg] = useState('Working…');
  useEffect(() => {
    const confirm = sp.get('confirm'), unsub = sp.get('unsubscribe');
    if (confirm) api('/api/newsletter/confirm', { method: 'POST', body: { token: confirm } }).then(() => setMsg('You’re on the list. Thanks!')).catch((e) => setMsg(e.message));
    else if (unsub) api('/api/newsletter/unsubscribe', { method: 'POST', body: { token: unsub } }).then(() => setMsg('You’re unsubscribed. No more emails.')).catch((e) => setMsg(e.message));
    else setMsg('Nothing to do here.');
  }, []);
  return <div className="narrow"><h1>Newsletter</h1><p>{msg}</p><a className="link" href="/">Back to oddball</a></div>;
}
export { BadgeIcon };
