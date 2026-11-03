import React, { useEffect, useState } from 'react';
import { X, Lock, Check, Coffee, Heart, ExternalLink, Sparkles } from 'lucide-react';
import { SITE, GAMES } from '../games.js';
import { MONEY, BUILT_WITH, DEV_LOG } from '../site.config.js';
import { THEMES, TRAILS, getCosmetics, setCosmetics, canUse, redeem } from '../client/cosmetics.js';

function Ball({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="var(--ink)" />
      <path d="M50 24 L66 36 L60 55 L40 55 L34 36 Z" fill="var(--bg)" />
      <path d="M50 4 L50 24 M66 36 L88 30 M60 55 L74 76 M40 55 L26 76 M34 36 L12 30" stroke="var(--bg)" strokeWidth="5" />
    </svg>
  );
}

/* Each game gets its own object instead of a matching card. */
function DeadlineArt() {
  return (
    <div className="obj obj-deadline" aria-hidden="true">
      <div className="dl-card"><b>91</b><span>ST</span><i /><em>HAALAND?</em></div>
      <div className="dl-bid">£84M</div>
      <div className="dl-tape">DONE DEAL · DONE DEAL · DONE DEAL · DONE DEAL ·</div>
    </div>
  );
}
function FormArt() {
  return (
    <div className="obj obj-form" aria-hidden="true">
      <div className="fm-sheet">
        <b>APPLICATION FORM</b>
        <span>Name <i /></span><span>Born <i /></span><span>Email <i /></span>
        <p className="x">✗ must be born on a Tuesday</p>
        <p className="x">✗ email must contain a fruit</p>
        <div className="fm-stamp">DENIED</div>
      </div>
    </div>
  );
}
function NationArt() {
  return (
    <div className="obj obj-nation" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" fill="#1e88e5" />
        <path d="M34 108 C26 70 64 46 102 48 C144 50 170 72 164 106 C158 138 126 152 98 150 C64 148 40 136 34 108 Z" fill="#f2d48a" />
        <path d="M42 106 C36 74 70 56 102 58 C138 60 158 80 154 106 C148 132 122 142 98 140 C68 138 48 128 42 106 Z" fill="#49c46f" />
        <rect x="74" y="88" width="14" height="13" fill="#fff" /><path d="M72 88 L81 79 L90 88 Z" fill="#ff6b57" />
        <rect x="94" y="94" width="12" height="11" fill="#fff" /><path d="M92 94 L100 86 L108 94 Z" fill="#ff6b57" />
        <circle cx="124" cy="104" r="8" fill="#1f8a4c" /><circle cx="134" cy="98" r="6" fill="#1f8a4c" />
        <g className="spin" style={{ transformOrigin: '62px 112px' }}><line x1="62" y1="112" x2="62" y2="98" stroke="#fff" strokeWidth="2.5" /><line x1="62" y1="112" x2="74" y2="119" stroke="#fff" strokeWidth="2.5" /><line x1="62" y1="112" x2="50" y2="119" stroke="#fff" strokeWidth="2.5" /></g>
        <line x1="62" y1="112" x2="62" y2="130" stroke="#fff" strokeWidth="2.5" />
        <path d="M150 40 q10 -6 20 0 t20 0" stroke="rgba(255,255,255,.5)" strokeWidth="3" fill="none" />
      </svg>
    </div>
  );
}
function AntiScamArt() {
  return (
    <div className="obj obj-antiscam" aria-hidden="true">
      <div className="xp w1"><div className="xp-t">Security Alert <i>×</i></div><div className="xp-b"><b>1,337</b> viruses found!<span>REMOVE ALL</span></div></div>
      <div className="xp w2"><div className="xp-t">!!! WINNER !!! <i>×</i></div><div className="xp-b">You won an iPod!</div></div>
    </div>
  );
}
function SandboxArt() { return <div className="obj obj-sandbox" aria-hidden="true"><Lock size={40} /><span>work in progress</span></div>; }
const ART = { deadline: DeadlineArt, form: FormArt, nation: NationArt, antiscam: AntiScamArt, sandbox: SandboxArt };

function Game({ g, onClick }) {
  const Art = ART[g.art];
  const inner = (
    <>
      {Art ? <Art /> : null}
      <h2>{g.title}{g.isNew && <span className="new">new</span>}</h2>
      <p>{g.blurb}</p>
      <small>{g.players}</small>
    </>
  );
  return <li className={`game g-${g.slug}`}>{onClick ? <button onClick={onClick}>{inner}</button> : <a href={g.href}>{inner}</a>}</li>;
}

function useLiveCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/healthz', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (alive) setN(Object.values(j.games || {}).reduce((t, g) => t + (g.players || 0), 0)); }).catch(() => {});
    load(); const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return n;
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`modal-box ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="icon" aria-label="Close" onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Shop({ onClose }) {
  const [c, setC] = useState(getCosmetics());
  const [code, setCode] = useState(''), [msg, setMsg] = useState('');
  useEffect(() => { const f = (e) => setC(e.detail); window.addEventListener('oddball-cosmetics', f); return () => window.removeEventListener('oddball-cosmetics', f); }, []);
  const tryCode = async () => { const ok = await redeem(code, MONEY.supporterCodeHashes); setMsg(ok ? 'Unlocked. Thank you!' : 'That code didn’t work.'); };
  const Item = ({ kind, id, def }) => {
    const usable = canUse(c, kind, id), active = (kind === 'theme' ? c.theme : c.trail) === id;
    return (
      <button className={`shop-item ${active ? 'on' : ''}`} disabled={!usable} onClick={() => setCosmetics(kind === 'theme' ? { theme: id } : { trail: id })}>
        {def.swatch ? <span className="swatch">{def.swatch.map((s) => <i key={s} style={{ background: s }} />)}</span> : <span className={`trail-ico t-${id}`} />}
        <b>{def.name}</b>
        <small>{active ? <><Check size={13} /> on</> : usable ? (def.free ? 'free' : 'yours') : <><Lock size={12} /> supporters</>}</small>
      </button>
    );
  };
  return (
    <Modal title="Shop" onClose={onClose} wide>
      <p className="muted">Looks only. Nothing here helps you win anything.</p>
      <h4>Themes</h4>
      <div className="shop-grid">{Object.entries(THEMES).map(([id, def]) => <Item key={id} kind="theme" id={id} def={def} />)}</div>
      <h4>Cursor trails</h4>
      <div className="shop-grid">{Object.entries(TRAILS).map(([id, def]) => <Item key={id} kind="trail" id={id} def={def} />)}</div>
      {!c.supporter && (
        <div className="shop-unlock">
          <b>Supporter pack: every theme and trail, on this browser.</b>
          {MONEY.kofiUrl && <a className="btn" href={MONEY.kofiUrl} target="_blank" rel="noreferrer"><Coffee size={16} /> Get a code on Ko-fi</a>}
          {MONEY.supporterCodeHashes.length > 0 ? (
            <div className="code-row">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Supporter code" aria-label="Supporter code" onKeyDown={(e) => { if (e.key === 'Enter') tryCode(); }} />
              <button className="btn" onClick={tryCode}>Unlock</button>
            </div>
          ) : <p className="muted small">Not on sale yet.</p>}
          {msg && <p className="muted small" role="status">{msg}</p>}
        </div>
      )}
    </Modal>
  );
}

function DevPanel({ open, onClose, focusBuilt }) {
  // `inert` keeps the closed panel out of the tab order and away from screen readers
  return (
    <aside className={`devpanel ${open ? 'open' : ''}`} aria-label="Dev log" {...(open ? {} : { inert: '' })}>
      <div className="dp-head"><b>Dev log</b><button className="icon" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
      <ol className="devlog">{DEV_LOG.map((d, i) => <li key={i}><time>{d.date}</time><span>{d.text}</span></li>)}</ol>
      <section id="built-with" className={focusBuilt ? 'flash' : ''}>
        <h4>Built with</h4>
        <ul className="built">{BUILT_WITH.map((b) => <li key={b.name}><a href={b.url} target="_blank" rel={b.affiliate ? 'sponsored noreferrer' : 'noreferrer'}>{b.name} <ExternalLink size={12} /></a><span>{b.what}{b.affiliate ? ' (affiliate link)' : ''}</span></li>)}</ul>
      </section>
      {(MONEY.kofiUrl || MONEY.patreonUrl || MONEY.assetStoreUrl) && (
        <section>
          <h4>Help keep it running</h4>
          <div className="dp-links">
            {MONEY.kofiUrl && <a className="btn" href={MONEY.kofiUrl} target="_blank" rel="noreferrer"><Coffee size={16} /> Ko-fi</a>}
            {MONEY.patreonUrl && <a className="btn" href={MONEY.patreonUrl} target="_blank" rel="noreferrer"><Heart size={16} /> Patreon</a>}
            {MONEY.assetStoreUrl && <a className="btn" href={MONEY.assetStoreUrl} target="_blank" rel="noreferrer"><Sparkles size={16} /> Asset packs</a>}
          </div>
        </section>
      )}
    </aside>
  );
}

function CarbonAd() {
  const ref = React.useRef(null);
  useEffect(() => {
    const { serve, placement } = MONEY.carbon; if (!serve || !placement || !ref.current) return;
    const s = document.createElement('script');
    s.async = true; s.id = '_carbonads_js'; s.src = `https://cdn.carbonads.com/carbon.js?serve=${encodeURIComponent(serve)}&placement=${encodeURIComponent(placement)}`;
    ref.current.appendChild(s);
  }, []);
  if (!MONEY.carbon.serve) return null;
  return <div className="carbon" ref={ref} />;
}

export function Hub() {
  const [shop, setShop] = useState(false), [panel, setPanel] = useState(false), [sandbox, setSandbox] = useState(false), [built, setBuilt] = useState(false);
  const live = useLiveCount();
  const goal = MONEY.tipGoal, pct = Math.min(100, Math.round((goal.raised / Math.max(1, goal.goal)) * 100));
  const random = () => { window.location.href = GAMES[Math.floor(Math.random() * GAMES.length)].href; };
  return (
    <div className="page">
      <nav className="top" aria-label="Site">
        {SITE.contactEmail ? <a href={`mailto:${SITE.contactEmail}?subject=Sponsoring%20a%20game%20on%20oddball`}>advertise</a> : <span />}
        <span className="top-r">
          {live > 0 && <span className="live"><i />{live} playing</span>}
          <button onClick={() => setShop(true)}>shop</button>
          <button onClick={() => setPanel((p) => !p)} aria-expanded={panel}>dev log</button>
        </span>
      </nav>

      <main>
        <header className="intro">
          <h1 className="wordmark" aria-label={SITE.name}><Ball className="wm-ball" /><span>ddball</span></h1>
          <p>{SITE.tagline} <button className="rand" onClick={random}>Or let fate decide.</button></p>
        </header>
        <ul className="games">
          {GAMES.map((g) => <Game key={g.slug} g={g} />)}
          {MONEY.patreonUrl && <Game g={{ slug: 'sandbox', title: 'The Sandbox', blurb: 'Half-finished experiments, for Patreon supporters.', players: 'Supporters', art: 'sandbox' }} onClick={() => setSandbox(true)} />}
        </ul>
      </main>

      <footer className="foot">
        <div className="foot-l"><CarbonAd /></div>
        <div className="foot-c"><span>{SITE.name}</span><button onClick={() => { setPanel(true); setBuilt(true); setTimeout(() => setBuilt(false), 1600); }}>built with…</button></div>
        <div className="foot-r">
          {MONEY.kofiUrl && (
            <a className="goal" href={MONEY.kofiUrl} target="_blank" rel="noreferrer">
              <span>{goal.label}: {goal.currency}{goal.raised} of {goal.currency}{goal.goal}</span>
              <span className="goal-bar"><i style={{ width: `${pct}%` }} /></span>
            </a>
          )}
        </div>
      </footer>

      <DevPanel open={panel} onClose={() => setPanel(false)} focusBuilt={built} />
      {shop && <Shop onClose={() => setShop(false)} />}
      {sandbox && (
        <Modal title="The Sandbox" onClose={() => setSandbox(false)}>
          <div className="sandbox-lock"><Lock size={36} /><p>Experiments that aren’t ready yet. Patreon supporters get the link.</p>
            <a className="btn" href={MONEY.patreonUrl} target="_blank" rel="noreferrer"><Heart size={16} /> Patreon</a>
            {MONEY.assetStoreUrl && <a className="link" href={MONEY.assetStoreUrl} target="_blank" rel="noreferrer">Art and sound packs</a>}
          </div>
        </Modal>
      )}
    </div>
  );
}
