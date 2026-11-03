import React, { useEffect, useMemo, useState } from 'react';
import { Monitor, Tablet, Smartphone, Columns2, RefreshCw, Plus, Trash2, Pencil, Check, X, Shield, AlertTriangle } from 'lucide-react';
import { api } from '../client/api.js';

const TABS = [['overview', 'Overview'], ['preview', 'Preview'], ['ads', 'Ads & sponsorships'], ['sponsors', 'Sponsors'], ['members', 'Memberships'], ['payments', 'Payments'], ['vault', 'Vault'], ['users', 'Users'], ['newsletter', 'Newsletter'], ['notes', 'Dev notes'], ['analytics', 'Analytics'], ['settings', 'Settings'], ['audit', 'Audit log']];
const GAME_OPTS = [['', '—'], ['deadline-day', 'Deadline Day'], ['normal-form', 'The Perfectly Normal Form'], ['tiny-nation', 'Tiny Nation'], ['anti-scam', 'Anti-Scam Arcade']];
const NEXT = { draft: [['preview', 'Send to preview']], preview: [['approved', 'Approve'], ['draft', 'Back to draft']], approved: [['active', 'Make active'], ['preview', 'Un-approve']], active: [['disabled', 'Disable']], disabled: [['approved', 'Re-approve'], ['draft', 'Back to draft']] };
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function useAdmin(path, deps = []) {
  const [s, set] = useState({ data: null, error: null });
  const load = () => api(path).then((data) => set({ data, error: null })).catch((e) => set({ data: null, error: e.message }));
  useEffect(() => { load(); }, deps);
  return [s.data, load, s.error];
}
function Err({ e }) { return e ? <div className="notice bad">{e}</div> : null; }

/* Generic form: fields = [{ k, label, type, options, help }] */
function Form({ fields, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="aform">
      {fields.map((f) => {
        const v = value[f.k] ?? '';
        let input;
        if (f.type === 'textarea') input = <textarea value={v} onChange={(e) => set(f.k, e.target.value)} rows={f.rows || 3} />;
        else if (f.type === 'select') input = <select value={v} onChange={(e) => set(f.k, e.target.value)}>{f.options.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select>;
        else if (f.type === 'check') input = <input type="checkbox" checked={!!value[f.k]} onChange={(e) => set(f.k, e.target.checked)} />;
        else if (f.type === 'date') input = <input type="datetime-local" value={v ? String(v).slice(0, 16) : ''} onChange={(e) => set(f.k, e.target.value ? new Date(e.target.value).toISOString() : '')} />;
        else if (f.type === 'image') input = (
          <div className="imgfield">
            {v && <img src={v} alt="" />}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 250_000) { alert('Please use an image under 250 KB.'); return; } const r = new FileReader(); r.onload = () => set(f.k, r.result); r.readAsDataURL(file); }} />
            <input placeholder="…or paste an https:// image link" value={v && !String(v).startsWith('data:') ? v : ''} onChange={(e) => set(f.k, e.target.value)} />
            {v && <button type="button" className="link" onClick={() => set(f.k, '')}>Remove image</button>}
          </div>
        );
        else input = <input type={f.type || 'text'} value={v} onChange={(e) => set(f.k, f.type === 'number' ? e.target.value : e.target.value)} />;
        return <label key={f.k} className={f.type === 'check' ? 'acheck' : ''}><span>{f.label}</span>{input}{f.help && <small>{f.help}</small>}</label>;
      })}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return <div className="modal" onClick={onClose}><div className="modal-box wide" onClick={(e) => e.stopPropagation()}><div className="row-between"><h3>{title}</h3><button className="icon" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>;
}

/* ---------- overview ---------- */
function Overview({ go }) {
  const [d, load, e] = useAdmin('/api/admin/overview');
  const [busy, setBusy] = useState(false);
  if (e) return <Err e={e} />; if (!d) return <p className="muted">Loading…</p>;
  const toggle = async () => {
    const on = !d.monetizationEnabled;
    if (on && !window.confirm('Turn ads ON for everyone? Only campaigns you’ve marked Active will appear.')) return;
    setBusy(true); await api('/api/admin/config', { method: 'POST', body: { monetization_enabled: on } }); await load(); setBusy(false);
  };
  return (
    <div className="ov">
      {d.storage.warning && <div className="notice bad"><AlertTriangle size={16} /> {d.storage.warning}</div>}
      <div className={`switch ${d.monetizationEnabled ? 'on' : ''}`}>
        <div><b>Ads & sponsorships are {d.monetizationEnabled ? 'LIVE' : 'OFF'}</b><span>{d.monetizationEnabled ? 'Visitors see campaigns marked Active.' : 'Nothing is shown to visitors. Use Preview to see how things would look.'}</span></div>
        <button className={`btn ${d.monetizationEnabled ? 'bad' : 'solid'}`} disabled={busy} onClick={toggle}>{d.monetizationEnabled ? 'Turn everything off' : 'Turn on'}</button>
      </div>
      <div className="cards">
        <div><small>Waiting for approval</small><b>{d.pendingApproval}</b><button className="link" onClick={() => go('ads')}>Review</button></div>
        <div><small>Active sponsorships</small><b>{d.activeSponsorships}</b></div>
        <div><small>Drafts</small><b>{d.campaigns.draft || 0}</b></div>
        <div><small>Sample ads (preview only)</small><b>{d.samples}</b></div>
        <div><small>Active supporters</small><b>{d.supporters}</b></div>
        <div><small>Accounts</small><b>{d.users}</b></div>
        <div><small>Vault items</small><b>{d.shopItems}</b></div>
        <div><small>Unmatched payments</small><b>{d.unmatchedPayments}</b>{d.unmatchedPayments > 0 && <button className="link" onClick={() => go('payments')}>Link them</button>}</div>
      </div>
      <h3>Money</h3>
      {!d.payments.configured ? <p className="notice">Financial reporting is unavailable: payments aren’t configured yet. See Payments for setup.</p>
        : <p>Payments recorded from {d.payments.provider} in the last 30 days{d.payments.testMode ? ' (test mode, test payments excluded)' : ''}: {d.recordedPayments30d && d.recordedPayments30d.length ? d.recordedPayments30d.map((m) => `${(m.cents / 100).toFixed(2)} ${m.currency || ''} from ${m.n} payment${m.n > 1 ? 's' : ''}`).join(', ') : 'none yet'}. These are what Ko-fi reported, before Ko-fi and PayPal/Stripe fees.</p>}
      <h3>Memberships by status</h3>
      <p>{Object.keys(d.subscriptions).length ? Object.entries(d.subscriptions).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'No memberships yet.'}</p>
      <h3>Setup checklist</h3>
      <ul className="checklist">
        <li className={d.storage.persistent ? 'ok' : ''}>{d.storage.persistent ? <Check size={14} /> : <X size={14} />} Permanent database ({d.storage.kind})</li>
        <li className={d.payments.configured ? 'ok' : ''}>{d.payments.configured ? <Check size={14} /> : <X size={14} />} Ko-fi webhook token on the server</li>
        <li className={d.payments.pageSet ? 'ok' : ''}>{d.payments.pageSet ? <Check size={14} /> : <X size={14} />} Ko-fi page link in Settings</li>
        <li className={d.mail ? 'ok' : ''}>{d.mail ? <Check size={14} /> : <X size={14} />} Email service (needed for the newsletter)</li>
      </ul>
      <h3>Recent activity</h3>
      <ul className="recent">{d.recent.map((r, i) => <li key={i}><time>{fmtDate(r.at)}</time> <b>{r.action}</b> {r.target} <span className="muted">{r.username ? `by ${r.username}` : ''}</span></li>)}</ul>
    </div>
  );
}

/* ---------- preview ---------- */
const PAGES = [['/', 'Home page'], ['/deadline-day/', 'Deadline Day'], ['/normal-form/', 'The Perfectly Normal Form'], ['/tiny-nation/', 'Tiny Nation'], ['/anti-scam/', 'Anti-Scam Arcade'], ['/support', 'Support page'], ['/vault', 'Supporter Vault'], ['/supporters', 'Supporter credits']];
const DEVICES = { desktop: [1280, 860, Monitor], tablet: [820, 1100, Tablet], mobile: [390, 844, Smartphone] };
const PLACES = [['footer', 'Footer ad'], ['home_sponsor', 'Home sponsor'], ['sponsored_card', 'Sponsored cards'], ['gotw', 'Game of the week'], ['game_sponsor', 'Sponsored experiment']];
function Frame({ src, device, label, width }) {
  const [w, h] = DEVICES[device];
  const scale = Math.min(1, width / w);
  return (
    <div className="frame-wrap" style={{ width: w * scale, height: h * scale }}>
      <span className="frame-label">{label}</span>
      <iframe title={label} src={src} style={{ width: w, height: h, transform: `scale(${scale})` }} />
    </div>
  );
}
function Preview() {
  const [page, setPage] = useState('/'), [device, setDevice] = useState('desktop'), [theme, setTheme] = useState('paper');
  const [show, setShow] = useState(Object.fromEntries(PLACES.map(([k]) => [k, true]))), [samples, setSamples] = useState(true), [compare, setCompare] = useState(false), [nonce, setNonce] = useState(0);
  const [boxW, setBoxW] = useState(1000);
  useEffect(() => { const m = () => setBoxW(Math.min(1180, window.innerWidth - 60)); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m); }, []);
  const qs = new URLSearchParams({ promo: 'preview', show: Object.keys(show).filter((k) => show[k]).join(','), samples: samples ? '1' : '0', theme, n: nonce });
  const sep = page.includes('?') ? '&' : '?';
  const src = `${page}${sep}${qs}`;
  const orig = `${page}${sep}promo=off&theme=${theme}&n=${nonce}`;
  const each = compare ? (boxW - 24) / 2 : boxW;
  return (
    <div className="preview">
      <p className="muted">This is the real site with promotions dropped in. Items marked <b>Preview</b>, <b>Approved</b> or <b>Active</b> show here. Nothing in preview is counted as an impression or click, and no third-party scripts load.</p>
      <div className="pv-controls">
        <label>Page<select value={page} onChange={(e) => setPage(e.target.value)}>{PAGES.map(([p, l]) => <option key={p} value={p}>{l}</option>)}</select></label>
        <div className="seg">{Object.entries(DEVICES).map(([k, [, , I]]) => <button key={k} className={device === k ? 'on' : ''} onClick={() => setDevice(k)}><I size={15} /> {k}</button>)}</div>
        <div className="seg"><button className={theme === 'paper' ? 'on' : ''} onClick={() => setTheme('paper')}>Light</button><button className={theme === 'midnight' ? 'on' : ''} onClick={() => setTheme('midnight')}>Dark</button></div>
        <button className={`btn ${compare ? 'solid' : ''}`} onClick={() => setCompare(!compare)}><Columns2 size={15} /> Before / after</button>
        <button className="btn" onClick={() => setNonce(nonce + 1)}><RefreshCw size={15} /> Reload</button>
      </div>
      <div className="pv-places">
        {PLACES.map(([k, l]) => <label key={k} className="acheck"><input type="checkbox" checked={show[k]} onChange={(e) => setShow({ ...show, [k]: e.target.checked })} /> {l}</label>)}
        <label className="acheck"><input type="checkbox" checked={samples} onChange={(e) => setSamples(e.target.checked)} /> Include sample ads</label>
      </div>
      <div className="frames">
        {compare && <Frame key={`o${orig}${device}`} src={orig} device={device} label="Now (no promotions)" width={each} />}
        <Frame key={`p${src}${device}`} src={src} device={device} label={compare ? 'With promotions' : 'Preview'} width={each} />
      </div>
    </div>
  );
}

/* ---------- ads ---------- */
const EMPTY_CAMPAIGN = { placement_id: 'footer', title: '', body: '', image: '', dest_url: '', label: 'Advertisement', game_slug: '', sponsored: true, sponsor_id: '', start_at: '', end_at: '' };
function Ads() {
  const [d, load, e] = useAdmin('/api/admin/campaigns');
  const [pl, loadPl] = useAdmin('/api/admin/placements');
  const [sp] = useAdmin('/api/admin/sponsors');
  const [edit, setEdit] = useState(null), [err, setErr] = useState('');
  const act = async (fn) => { setErr(''); try { await fn(); await load(); } catch (x) { setErr(x.message); } };
  const save = () => act(async () => {
    const body = { ...edit, game_slug: edit.game_slug || null, sponsor_id: edit.sponsor_id || null, start_at: edit.start_at || null, end_at: edit.end_at || null };
    if (edit.id) await api(`/api/admin/campaigns/${edit.id}`, { method: 'PUT', body }); else await api('/api/admin/campaigns', { method: 'POST', body });
    setEdit(null);
  });
  if (e) return <Err e={e} />; if (!d || !pl) return <p className="muted">Loading…</p>;
  const fields = [
    { k: 'placement_id', label: 'Where', type: 'select', options: pl.placements.map((p) => [p.id, p.name]) },
    { k: 'title', label: 'Title / brand name' },
    { k: 'body', label: 'Short text', type: 'textarea', rows: 2 },
    ...(['footer', 'sponsored_card', 'gotw'].includes(edit && edit.placement_id) ? [{ k: 'image', label: 'Image or thumbnail', type: 'image', help: 'PNG, JPG, WebP or GIF under 250 KB.' }] : []),
    { k: 'dest_url', label: 'Link (https://…)', help: edit && edit.placement_id === 'gotw' ? 'Optional. Leave empty to link to the game itself.' : 'Where people go when they click.' },
    { k: 'label', label: 'Label shown to visitors', help: 'e.g. Advertisement, Sponsored, Sponsor, Game of the week' },
    ...(['gotw', 'game_sponsor'].includes(edit && edit.placement_id) ? [{ k: 'game_slug', label: 'Which game', type: 'select', options: GAME_OPTS }] : []),
    ...(edit && edit.placement_id === 'gotw' ? [{ k: 'sponsored', label: 'This Game of the Week is sponsored', type: 'check' }] : []),
    { k: 'sponsor_id', label: 'Sponsor', type: 'select', options: [['', '—'], ...(sp ? sp.sponsors.map((s) => [s.id, s.name]) : [])] },
    { k: 'start_at', label: 'Starts', type: 'date' }, { k: 'end_at', label: 'Ends', type: 'date', help: 'It stops showing by itself after this.' },
  ];
  const groups = ['preview', 'approved', 'active', 'draft', 'disabled'];
  const now = Date.now();
  return (
    <div>
      <div className="row-between"><p className="muted">Every placement goes Draft → Preview → Approved → Active. Editing an approved or active one sends it back to Preview.</p><button className="btn solid" onClick={() => setEdit({ ...EMPTY_CAMPAIGN })}><Plus size={15} /> New campaign</button></div>
      <Err e={err} />
      {groups.map((g) => {
        const list = d.campaigns.filter((c) => c.status === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <h3 className="cap">{g} ({list.length})</h3>
            <table className="tbl"><thead><tr><th>Campaign</th><th>Where</th><th>Dates</th><th>Seen / clicks</th><th /></tr></thead><tbody>
              {list.map((c) => {
                const expired = c.end_at && new Date(c.end_at).getTime() < now, scheduled = c.start_at && new Date(c.start_at).getTime() > now;
                return (
                  <tr key={c.id}>
                    <td><b>{c.title}</b>{c.sample && <span className="pill">sample</span>}{expired && <span className="pill bad">expired</span>}{scheduled && <span className="pill">scheduled</span>}<br /><small className="muted">{c.body}</small></td>
                    <td>{(pl.placements.find((p) => p.id === c.placement_id) || {}).name}{c.game_slug ? ` · ${c.game_slug}` : ''}</td>
                    <td className="small">{c.start_at ? fmtDate(c.start_at) : 'now'} → {c.end_at ? fmtDate(c.end_at) : 'no end'}</td>
                    <td className="small">{c.impressions} / {c.clicks}{c.status !== 'active' && <span className="muted"> (live only)</span>}</td>
                    <td className="acts">
                      {(NEXT[c.status] || []).filter(([to]) => !(c.sample && to === 'active')).map(([to, l]) => <button key={to} className={`btn small ${to === 'active' || to === 'approved' ? 'solid' : ''}`} onClick={() => act(() => { if (to === 'active' && !window.confirm(`Make “${c.title}” active? It shows to visitors when the global switch is on.`)) throw new Error('Cancelled.'); return api(`/api/admin/campaigns/${c.id}/status`, { method: 'POST', body: { to } }); })}>{l}</button>)}
                      <button className="icon" aria-label="Edit" onClick={() => setEdit({ ...EMPTY_CAMPAIGN, ...c, game_slug: c.game_slug || '', sponsor_id: c.sponsor_id || '', image: c.image || '', dest_url: c.dest_url || '' })}><Pencil size={15} /></button>
                      {(c.status === 'draft' || c.sample) && <button className="icon" aria-label="Delete" onClick={() => window.confirm('Delete this campaign?') && act(() => api(`/api/admin/campaigns/${c.id}`, { method: 'DELETE' }))}><Trash2 size={15} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody></table>
          </section>
        );
      })}
      <h3>Placements</h3>
      <table className="tbl"><thead><tr><th>Placement</th><th>Type</th><th>On</th><th>Desktop</th><th>Mobile</th><th>Size</th></tr></thead><tbody>
        {pl.placements.map((p) => (
          <tr key={p.id}>
            <td><b>{p.name}</b><br /><small className="muted">{p.description}</small></td><td><code>{p.id}</code> · {p.type}</td>
            {['enabled', 'desktop', 'mobile'].map((k) => <td key={k}><input type="checkbox" checked={p[k]} onChange={async (e) => { await api(`/api/admin/placements/${p.id}`, { method: 'PUT', body: { [k]: e.target.checked } }); loadPl(); }} aria-label={`${p.name} ${k}`} /></td>)}
            <td className="small">{p.width ? `${p.width}×${p.height}` : 'fits content'}</td>
          </tr>
        ))}
      </tbody></table>
      {edit && <Modal title={edit.id ? 'Edit campaign' : 'New campaign'} onClose={() => setEdit(null)}><Form fields={fields} value={edit} onChange={setEdit} /><Err e={err} /><div className="row"><button className="btn solid" onClick={save}>{edit.id ? 'Save' : 'Create draft'}</button><button className="btn" onClick={() => setEdit(null)}>Cancel</button></div></Modal>}
    </div>
  );
}

/* ---------- small CRUD sections ---------- */
function Sponsors() {
  const [d, load, e] = useAdmin('/api/admin/sponsors');
  const [edit, setEdit] = useState(null), [err, setErr] = useState('');
  if (e) return <Err e={e} />; if (!d) return <p className="muted">Loading…</p>;
  const save = async () => { setErr(''); try { await api('/api/admin/sponsors', { method: 'POST', body: edit }); setEdit(null); load(); } catch (x) { setErr(x.message); } };
  return (
    <div>
      <div className="row-between"><p className="muted">Companies and developers you work with. Attach them to campaigns.</p><button className="btn solid" onClick={() => setEdit({ name: '' })}><Plus size={15} /> Add sponsor</button></div>
      {d.sponsors.length === 0 ? <p className="muted">No sponsors yet.</p> : <table className="tbl"><thead><tr><th>Name</th><th>Contact</th><th>Website</th><th /></tr></thead><tbody>{d.sponsors.map((s) => <tr key={s.id}><td><b>{s.name}</b><br /><small className="muted">{s.notes}</small></td><td>{s.contact}</td><td>{s.website}</td><td className="acts"><button className="icon" aria-label="Edit" onClick={() => setEdit(s)}><Pencil size={15} /></button><button className="icon" aria-label="Delete" onClick={async () => { if (window.confirm('Delete sponsor?')) { await api(`/api/admin/sponsors/${s.id}`, { method: 'DELETE' }); load(); } }}><Trash2 size={15} /></button></td></tr>)}</tbody></table>}
      {edit && <Modal title="Sponsor" onClose={() => setEdit(null)}><Form fields={[{ k: 'name', label: 'Name' }, { k: 'contact', label: 'Contact person / email' }, { k: 'website', label: 'Website (https://…)' }, { k: 'notes', label: 'Notes (private)', type: 'textarea' }]} value={edit} onChange={setEdit} /><Err e={err} /><button className="btn solid" onClick={save}>Save</button></Modal>}
    </div>
  );
}

function Members() {
  const [t, loadT] = useAdmin('/api/admin/tiers');
  const [m, loadM, e] = useAdmin('/api/admin/members');
  const [edit, setEdit] = useState(null), [grant, setGrant] = useState({ username: '', tier: 'supporter', days: 31, note: '' }), [err, setErr] = useState(''), [ok, setOk] = useState('');
  if (e) return <Err e={e} />; if (!t || !m) return <p className="muted">Loading…</p>;
  const saveTier = async () => { setErr(''); try { await api(`/api/admin/tiers/${edit.id}`, { method: 'PUT', body: { ...edit, price_cents: Math.round(Number(edit.price) * 100), perks: String(edit.perksText).split('\n') } }); setEdit(null); loadT(); } catch (x) { setErr(x.message); } };
  const doGrant = async () => { setErr(''); setOk(''); try { await api('/api/admin/members/grant', { method: 'POST', body: grant }); setOk(`Granted ${grant.tier} to ${grant.username}.`); loadM(); } catch (x) { setErr(x.message); } };
  const revoke = async (username) => { if (!window.confirm(`End ${username}’s membership now?`)) return; await api('/api/admin/members/revoke', { method: 'POST', body: { username, immediate: true } }); loadM(); };
  return (
    <div>
      <h3>Tiers</h3>
      <p className="muted">The Ko-fi tier name must match your Ko-fi membership tier exactly, so payments map to the right tier.</p>
      <table className="tbl"><thead><tr><th>Tier</th><th>Price</th><th>Ko-fi tier name</th><th>Benefits</th><th>On</th><th /></tr></thead><tbody>
        {t.tiers.map((x) => <tr key={x.id}><td><b>{x.name}</b></td><td>{x.rank ? `${(x.price_cents / 100).toFixed(2)} ${x.currency}/mo` : 'Free'}</td><td>{x.provider_ref || '—'}</td><td className="small">{x.perks.join(' · ')}</td><td>{x.active ? 'yes' : 'no'}</td><td><button className="icon" aria-label="Edit tier" onClick={() => setEdit({ ...x, price: (x.price_cents / 100).toFixed(2), perksText: x.perks.join('\n') })}><Pencil size={15} /></button></td></tr>)}
      </tbody></table>
      <h3>Give or fix a membership</h3>
      <p className="muted">For gifts, or when a payment couldn’t be matched. Everything here goes in the audit log.</p>
      <div className="row wrap">
        <input placeholder="username" value={grant.username} onChange={(e) => setGrant({ ...grant, username: e.target.value })} aria-label="Username" />
        <select value={grant.tier} onChange={(e) => setGrant({ ...grant, tier: e.target.value })} aria-label="Tier">{t.tiers.filter((x) => x.rank > 0).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input type="number" value={grant.days} min={1} max={3660} onChange={(e) => setGrant({ ...grant, days: e.target.value })} aria-label="Days" style={{ width: 90 }} /> days
        <input placeholder="reason (private)" value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} aria-label="Reason" />
        <button className="btn solid" onClick={doGrant}>Grant</button>
      </div>
      {ok && <div className="notice good">{ok}</div>}<Err e={err} />
      <h3>Members</h3>
      {m.members.length === 0 ? <p className="muted">No memberships yet.</p> : <table className="tbl"><thead><tr><th>User</th><th>Tier</th><th>Status</th><th>Until</th><th>Via</th><th /></tr></thead><tbody>
        {m.members.map((x) => <tr key={x.id}><td>{x.username}</td><td>{x.tier_name}{x.test && <span className="pill">test</span>}</td><td><span className={`status s-${x.effective}`}>{x.effective}</span></td><td className="small">{fmtDate(x.current_period_end)}</td><td className="small">{x.provider}{x.note ? ` · ${x.note}` : ''}</td><td>{['active', 'past_due', 'cancelled'].includes(x.effective) && <button className="btn small bad" onClick={() => revoke(x.username)}>End now</button>}</td></tr>)}
      </tbody></table>}
      {edit && <Modal title={`Edit ${edit.name}`} onClose={() => setEdit(null)}><Form fields={[{ k: 'name', label: 'Name' }, ...(edit.rank ? [{ k: 'price', label: 'Price per month', type: 'number' }, { k: 'currency', label: 'Currency (3 letters)' }, { k: 'provider_ref', label: 'Ko-fi tier name' }, { k: 'active', label: 'Offer this tier', type: 'check' }] : []), { k: 'perksText', label: 'Benefits, one per line', type: 'textarea', rows: 5 }]} value={edit} onChange={setEdit} /><Err e={err} /><button className="btn solid" onClick={saveTier}>Save tier</button></Modal>}
    </div>
  );
}

function Payments() {
  const [filter, setFilter] = useState('');
  const [d, load, e] = useAdmin(`/api/admin/events${filter ? `?status=${filter}` : ''}`, [filter]);
  const [ov] = useAdmin('/api/admin/overview');
  const [link, setLink] = useState({}), [err, setErr] = useState('');
  const hook = `${window.location.origin}/api/pay/kofi/webhook`;
  return (
    <div>
      <section className="setup">
        <h3>Setting up Ko-fi payments</h3>
        {ov && <p>{ov.payments.configured ? <span className="status s-active">Webhook token is set</span> : <span className="status s-expired">Not configured</span>} {ov.payments.testMode && <span className="pill">test mode</span>}</p>}
        <ol>
          <li>The Ko-fi account must belong to an adult (or a business) who can meet Ko-fi’s and PayPal/Stripe’s identity checks.</li>
          <li>On Ko-fi, create monthly membership tiers named exactly like the “Ko-fi tier name” column in Memberships.</li>
          <li>Ko-fi → Settings → API → Webhooks: set the URL to <code>{hook}</code>.</li>
          <li>Copy Ko-fi’s verification token into a Render environment variable called <code>KOFI_VERIFICATION_TOKEN</code>. Never paste it into the site’s code.</li>
          <li>Optionally set <code>KOFI_TEST_MODE=1</code> while testing, then use Ko-fi’s “Send test” button. Test payments are marked and left out of money totals.</li>
          <li>Put your Ko-fi page link in Settings. The Join buttons open once both are set.</li>
        </ol>
      </section>
      <div className="row-between"><h3>Payment events</h3><select value={filter} onChange={(e2) => setFilter(e2.target.value)} aria-label="Filter"><option value="">All</option><option value="unmatched">Unmatched</option><option value="linked">Linked</option></select></div>
      <Err e={e || err} />
      {!d ? <p className="muted">Loading…</p> : d.events.length === 0 ? <p className="muted">No payments received yet.</p> : (
        <table className="tbl"><thead><tr><th>When</th><th>Type</th><th>Amount</th><th>From</th><th>Status</th><th /></tr></thead><tbody>
          {d.events.map((x) => (
            <tr key={x.id}>
              <td className="small">{fmtDate(x.received_at)}</td><td>{x.type}{x.tier_name ? ` · ${x.tier_name}` : ''}{x.test && <span className="pill">test</span>}</td>
              <td>{x.amount_cents != null ? `${(x.amount_cents / 100).toFixed(2)} ${x.currency || ''}` : '—'}</td>
              <td className="small">{x.from_name}{x.message ? <><br /><span className="muted">“{x.message.slice(0, 60)}”</span></> : null}</td>
              <td><span className={`status s-${x.status === 'linked' ? 'active' : 'past_due'}`}>{x.status}</span>{x.username ? ` → ${x.username}` : ''}</td>
              <td>{x.status === 'unmatched' && <div className="row"><input placeholder="username" value={link[x.id] || ''} onChange={(ev) => setLink({ ...link, [x.id]: ev.target.value })} aria-label="Username to link" style={{ width: 120 }} /><button className="btn small solid" onClick={async () => { setErr(''); try { const r = await api(`/api/admin/events/${x.id}/link`, { method: 'POST', body: { username: link[x.id] } }); if (r.status !== 'linked') setErr(r.reason === 'unknown tier' ? 'Linked to the user, but the Ko-fi tier name doesn’t match any tier. Fix the tier name in Memberships, then grant it there.' : 'Couldn’t link that.'); load(); } catch (x2) { setErr(x2.message); } }}>Link</button></div>}</td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  );
}

function VaultAdmin() {
  const [d, load, e] = useAdmin('/api/admin/products');
  const [t] = useAdmin('/api/admin/tiers');
  const [edit, setEdit] = useState(null), [err, setErr] = useState(''), [kind, setKind] = useState('all');
  if (e) return <Err e={e} />; if (!d || !t) return <p className="muted">Loading…</p>;
  const KIND_FIELDS = { title: [{ k: 'd_text', label: 'Title text' }], badge: [{ k: 'd_icon', label: 'Icon', type: 'select', options: ['heart', 'sprout', 'og', 'bolt', 'flask', 'crown', 'gem', 'cake', 'trophy', 'pumpkin', 'star'].map((x) => [x, x]) }, { k: 'd_color', label: 'Colour (#rrggbb)' }, { k: 'd_animated', label: 'Animated', type: 'check' }, { k: 'd_milestone', label: 'Milestone (home visits needed, optional)', type: 'number' }], theme: [{ k: 'd_theme', label: 'Theme', type: 'select', options: ['paper', 'midnight', 'terminal', 'retro', 'notebook', 'neon', 'mono', 'gold'].map((x) => [x, x]) }], accent: [{ k: 'd_color', label: 'Colour (#rrggbb)' }], decoration: [{ k: 'd_border', label: 'Border', type: 'select', options: [['', 'none'], ...['dashed', 'stamp', 'glow', 'pixel', 'gold'].map((x) => [x, x])] }, { k: 'd_pattern', label: 'Pattern', type: 'select', options: [['', 'none'], ...['dots', 'stripes', 'grid'].map((x) => [x, x])] }], trail: [{ k: 'd_trail', label: 'Trail', type: 'select', options: ['sparkle', 'comet', 'confetti', 'snow'].map((x) => [x, x]) }] };
  const open = (p) => { const base = { ...p, min_tier: p.min_tier || '' }; for (const [k, v] of Object.entries(p.data || {})) base[`d_${k}`] = v; setEdit(base); };
  const save = async () => {
    setErr('');
    const data = {}; for (const [k, v] of Object.entries(edit)) if (k.startsWith('d_') && v !== '' && v != null) data[k.slice(2)] = k === 'd_milestone' ? Number(v) : v;
    try { await api('/api/admin/products', { method: 'POST', body: { ...edit, min_tier: edit.min_tier || null, data } }); setEdit(null); load(); } catch (x) { setErr(x.message); }
  };
  const remove = async (p) => { if (!window.confirm(p.owners ? `${p.owners} people own this. It will be retired, not deleted, so nobody loses it.` : 'Delete this item?')) return; await api(`/api/admin/products/${p.id}`, { method: 'DELETE' }); load(); };
  const list = d.products.filter((p) => kind === 'all' || p.kind === kind);
  return (
    <div>
      <div className="row-between"><div className="chips">{['all', 'title', 'badge', 'theme', 'accent', 'decoration', 'trail'].map((k) => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div><button className="btn solid" onClick={() => setEdit({ id: '', name: '', kind: 'title', description: '', min_tier: 'supporter', keep: true, available: true, collection: '' })}><Plus size={15} /> Add item</button></div>
      <table className="tbl"><thead><tr><th>Item</th><th>Type</th><th>Needs</th><th>Rule</th><th>Collection</th><th>Owners</th><th /></tr></thead><tbody>
        {list.map((p) => <tr key={p.id} className={p.archived ? 'dim' : ''}><td><b>{p.name}</b>{!p.available && <span className="pill">unavailable</span>}{p.archived && <span className="pill bad">retired</span>}<br /><small className="muted">{p.description}</small></td><td>{p.kind}</td><td>{p.min_tier || 'free'}</td><td className="small">{p.keep ? 'yours to keep' : 'while subscribed'}</td><td className="small">{p.collection || '—'}</td><td>{p.owners}</td><td className="acts"><button className="icon" aria-label="Edit" onClick={() => open(p)}><Pencil size={15} /></button>{!p.archived && <button className="icon" aria-label="Remove" onClick={() => remove(p)}><Trash2 size={15} /></button>}</td></tr>)}
      </tbody></table>
      {edit && <Modal title={edit.created_at ? `Edit ${edit.name}` : 'New Vault item'} onClose={() => setEdit(null)}>
        <Form fields={[{ k: 'id', label: 'ID (letters, numbers, dashes)', help: edit.created_at ? 'Can’t be changed.' : 'e.g. title-sleepy' }, { k: 'name', label: 'Name' }, { k: 'kind', label: 'Type', type: 'select', options: ['title', 'badge', 'theme', 'accent', 'decoration', 'trail'].map((x) => [x, x]) }, { k: 'description', label: 'Description', type: 'textarea', rows: 2 }, { k: 'min_tier', label: 'Who can use it', type: 'select', options: [['', 'Everyone with an account'], ...t.tiers.filter((x) => x.rank > 0).map((x) => [x.id, `${x.name} and up`])] }, { k: 'keep', label: 'Yours to keep once unlocked (otherwise: only while subscribed)', type: 'check' }, { k: 'collection', label: 'Collection (optional, e.g. Winter)' }, { k: 'available', label: 'Available now', type: 'check' }, ...(KIND_FIELDS[edit.kind] || [])]} value={edit} onChange={(v) => setEdit(edit.created_at ? { ...v, id: edit.id } : v)} />
        <Err e={err} /><button className="btn solid" onClick={save}>Save item</button>
      </Modal>}
    </div>
  );
}

function Users() {
  const [qy, setQy] = useState('');
  const [d, load, e] = useAdmin(`/api/admin/users?q=${encodeURIComponent(qy)}`, [qy]);
  const set = async (u, body) => { try { await api(`/api/admin/users/${u.id}`, { method: 'POST', body }); load(); } catch (x) { alert(x.message); } };
  return (
    <div>
      <input placeholder="Search usernames" value={qy} onChange={(ev) => setQy(ev.target.value)} aria-label="Search users" />
      <Err e={e} />
      {d && <table className="tbl"><thead><tr><th>User</th><th>Joined</th><th>In credits</th><th>Featured</th><th>Role</th></tr></thead><tbody>
        {d.users.map((u) => <tr key={u.id}><td><a className="link" href={`/u/${u.username}`}>{u.username}</a></td><td className="small">{fmtDate(u.created_at)}</td><td>{u.public_credits ? 'yes' : 'hidden'}</td><td><input type="checkbox" checked={u.featured} onChange={(ev) => set(u, { featured: ev.target.checked })} aria-label="Featured supporter" /></td><td><select value={u.role} onChange={(ev) => window.confirm(`Make ${u.username} ${ev.target.value}?`) && set(u, { role: ev.target.value })} aria-label="Role"><option value="user">user</option><option value="admin">admin</option></select></td></tr>)}
      </tbody></table>}
    </div>
  );
}

function Newsletter() {
  const [d, load, e] = useAdmin('/api/admin/newsletter');
  const [edit, setEdit] = useState(null), [err, setErr] = useState('');
  if (e) return <Err e={e} />; if (!d) return <p className="muted">Loading…</p>;
  const save = async () => { setErr(''); try { await api('/api/admin/newsletter', { method: 'POST', body: edit }); setEdit(null); load(); } catch (x) { setErr(x.message); } };
  return (
    <div>
      {!d.mail && <div className="notice">Email isn’t configured, so the signup form is hidden and nothing can be sent. Set <code>RESEND_API_KEY</code> and <code>MAIL_FROM</code> on the server to open signups.</div>}
      <p>Subscribers: {Object.keys(d.counts).length ? Object.entries(d.counts).map(([k, v]) => `${k} ${v}`).join(' · ') : 'none yet'}. Addresses are never shown here or shared with sponsors.</p>
      <div className="row-between"><h3>Issues and sponsor slots</h3><button className="btn solid" onClick={() => setEdit({ subject: '', status: 'draft' })}><Plus size={15} /> New issue</button></div>
      {d.issues.map((i) => (
        <div key={i.id} className="issue">
          <div className="row-between"><b>{i.subject}</b><span className="row"><span className="pill">{i.status}</span><button className="icon" aria-label="Edit" onClick={() => setEdit(i)}><Pencil size={15} /></button><button className="icon" aria-label="Delete" onClick={async () => { if (window.confirm('Delete this issue?')) { await api(`/api/admin/newsletter/${i.id}`, { method: 'DELETE' }); load(); } }}><Trash2 size={15} /></button></span></div>
          <div className="mail-preview"><small className="muted">How the sponsor block looks in the email:</small>
            {i.sponsor_name ? <div className="mail-sponsor"><span>Sponsored</span><b>{i.sponsor_name}</b><p>{i.sponsor_text}</p>{i.sponsor_url && <u>{i.sponsor_url}</u>}</div> : <p className="muted">No sponsor for this issue.</p>}
          </div>
        </div>
      ))}
      {edit && <Modal title="Newsletter issue" onClose={() => setEdit(null)}><Form fields={[{ k: 'subject', label: 'Subject' }, { k: 'status', label: 'Status', type: 'select', options: [['draft', 'draft'], ['ready', 'ready']] }, { k: 'sponsor_name', label: 'Sponsor name (optional)' }, { k: 'sponsor_text', label: 'Sponsor text', type: 'textarea', rows: 2 }, { k: 'sponsor_url', label: 'Sponsor link (https://…)' }, { k: 'notes', label: 'Private notes', type: 'textarea' }]} value={edit} onChange={setEdit} /><Err e={err} /><button className="btn solid" onClick={save}>Save</button></Modal>}
    </div>
  );
}

function Notes() {
  const [d, load, e] = useAdmin('/api/admin/notes');
  const [t] = useAdmin('/api/admin/tiers');
  const [edit, setEdit] = useState(null), [err, setErr] = useState('');
  if (e) return <Err e={e} />; if (!d || !t) return <p className="muted">Loading…</p>;
  const save = async () => { setErr(''); try { await api('/api/admin/notes', { method: 'POST', body: { ...edit, min_tier: edit.min_tier || null } }); setEdit(null); load(); } catch (x) { setErr(x.message); } };
  return (
    <div>
      <div className="row-between"><p className="muted">Behind-the-scenes posts at /notes. Only promise supporter notes you’ll actually keep writing.</p><button className="btn solid" onClick={() => setEdit({ title: '', body: '', min_tier: '', published: false })}><Plus size={15} /> New note</button></div>
      {d.notes.length === 0 ? <p className="muted">No notes yet.</p> : d.notes.map((n) => <div key={n.id} className="issue"><div className="row-between"><b>{n.title}</b><span className="row"><span className="pill">{n.published ? 'published' : 'draft'}</span><span className="pill">{n.min_tier || 'everyone'}</span><button className="icon" aria-label="Edit" onClick={() => setEdit({ ...n, min_tier: n.min_tier || '' })}><Pencil size={15} /></button><button className="icon" aria-label="Delete" onClick={async () => { if (window.confirm('Delete note?')) { await api(`/api/admin/notes/${n.id}`, { method: 'DELETE' }); load(); } }}><Trash2 size={15} /></button></span></div><p className="small">{n.body.slice(0, 200)}</p></div>)}
      {edit && <Modal title="Dev note" onClose={() => setEdit(null)}><Form fields={[{ k: 'title', label: 'Title' }, { k: 'body', label: 'Text', type: 'textarea', rows: 8 }, { k: 'min_tier', label: 'Who can read it', type: 'select', options: [['', 'Everyone'], ...t.tiers.filter((x) => x.rank > 0).map((x) => [x.id, `${x.name} and up`])] }, { k: 'published', label: 'Published', type: 'check' }]} value={edit} onChange={setEdit} /><Err e={err} /><button className="btn solid" onClick={save}>Save note</button></Modal>}
    </div>
  );
}

function Analytics() {
  const [d, , e] = useAdmin('/api/admin/analytics');
  if (e) return <Err e={e} />; if (!d) return <p className="muted">Loading…</p>;
  const label = { page: ['Page views', 'Counted on page load. Estimated: blockers and bots can skew it.'], impression: ['Ad impressions', 'Counted when at least half the ad is on screen. Estimated.'], click: ['Ad clicks', 'Counted on our server when someone follows the link. Verified.'], conversion: ['New memberships', 'Counted when a verified payment starts a membership. Verified.'], unlock: ['Vault unlocks', 'Counted on our server. Verified.'] };
  const max = Math.max(1, ...d.daily.map((x) => x.n));
  return (
    <div>
      <p className="muted">Last 30 days. No cookies, no user ids, no IP addresses. Preview views are never counted.</p>
      <p>Home page visits, all time: <b>{d.homeVisitsAllTime.toLocaleString()}</b> (milestone badges unlock from this number).</p>
      <div className="bars big">{d.daily.map((x) => <span key={x.day} title={`${x.day}: ${x.n}`} style={{ height: `${(x.n / max) * 100}%` }} />)}</div>
      {Object.keys(label).map((k) => {
        const rows = d.totals.filter((x) => x.kind === k);
        return <section key={k}><h3>{label[k][0]}</h3><p className="muted small">{label[k][1]}</p>{rows.length === 0 ? <p className="muted">Nothing yet.</p> : <table className="tbl"><tbody>{rows.map((r) => <tr key={r.target}><td>{r.target}</td><td>{r.n.toLocaleString()}</td></tr>)}</tbody></table>}</section>;
      })}
    </div>
  );
}

function Settings() {
  const [d, load, e] = useAdmin('/api/admin/config');
  const [s, setS] = useState(null), [msg, setMsg] = useState(null);
  useEffect(() => { if (d) setS({ ...(d.site || {}), coffee: (d.site.coffee_amounts || []).join(', ') }); }, [d]);
  if (e) return <Err e={e} />; if (!s) return <p className="muted">Loading…</p>;
  const save = async () => { setMsg(null); try { await api('/api/admin/config', { method: 'POST', body: { site: { contact_email: s.contact_email, kofi_url: s.kofi_url, kofi_manage_url: s.kofi_manage_url, coffee_amounts: String(s.coffee).split(',').map((x) => x.trim()).filter(Boolean) } } }); setMsg({ k: 'good', t: 'Saved.' }); load(); } catch (x) { setMsg({ k: 'bad', t: x.message }); } };
  return (
    <div className="narrow">
      <Form fields={[{ k: 'kofi_url', label: 'Your Ko-fi page (https://ko-fi.com/…)', help: 'Join and coffee buttons open this page.' }, { k: 'kofi_manage_url', label: 'Where supporters manage or cancel', help: 'Usually your Ko-fi page or Ko-fi’s account page.' }, { k: 'coffee', label: 'Suggested coffee amounts (dollars, comma separated)' }, { k: 'contact_email', label: 'Contact email for advertisers', help: 'Shown on the Advertise page. Leave empty to hide it.' }]} value={s} onChange={setS} />
      {msg && <div className={`notice ${msg.k}`}>{msg.t}</div>}
      <button className="btn solid" onClick={save}>Save settings</button>
    </div>
  );
}
function Audit() {
  const [d, , e] = useAdmin('/api/admin/audit');
  if (e) return <Err e={e} />; if (!d) return <p className="muted">Loading…</p>;
  return <table className="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Target</th></tr></thead><tbody>{d.log.map((l) => <tr key={l.id}><td className="small">{fmtDate(l.at)}</td><td>{l.username || 'system'}</td><td><code>{l.action}</code></td><td className="small">{l.target}</td></tr>)}</tbody></table>;
}

/* ---------- shell ---------- */
export function Admin({ me }) {
  const [tab, setTab] = useState(() => (window.location.hash || '#overview').slice(1));
  const [token, setToken] = useState(''), [err, setErr] = useState('');
  useEffect(() => { const h = () => setTab((window.location.hash || '#overview').slice(1)); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  const go = (t) => { window.location.hash = t; setTab(t); };
  if (!me) return <div className="narrow"><h1>Admin</h1><p>Sign in first.</p><a className="btn solid" href="/login?next=/admin">Sign in</a></div>;
  if (me.user.role !== 'admin') {
    const claim = async () => { setErr(''); try { await api('/api/admin/bootstrap', { method: 'POST', body: { token } }); window.location.reload(); } catch (x) { setErr(x.message); } };
    return (
      <div className="narrow"><h1><Shield size={22} /> Admins only</h1>
        <p className="muted">Setting up oddball for the first time? Enter the setup token from your server’s <code>ADMIN_SETUP_TOKEN</code> setting. It only works once, while there’s no admin yet.</p>
        <div className="row"><input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Setup token" aria-label="Setup token" /><button className="btn solid" onClick={claim}>Become admin</button></div>
        <Err e={err} />
      </div>
    );
  }
  const C = { overview: () => <Overview go={go} />, preview: Preview, ads: Ads, sponsors: Sponsors, members: Members, payments: Payments, vault: VaultAdmin, users: Users, newsletter: Newsletter, notes: Notes, analytics: Analytics, settings: Settings, audit: Audit }[tab] || (() => <Overview go={go} />);
  return (
    <div className="admin">
      <h1>Admin</h1>
      <nav className="atabs" aria-label="Admin sections">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}</nav>
      <C />
    </div>
  );
}
