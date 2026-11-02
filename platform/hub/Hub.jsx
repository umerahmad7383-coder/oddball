import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, PanelRight, X, Shuffle, Lock, Check, Coffee, Heart, ExternalLink, Megaphone, Sparkles, Hammer } from 'lucide-react';
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

/* ---------- tile art ---------- */
function DeadlineArt() {
  return (
    <div className="art art-deadline" aria-hidden="true">
      <div className="dla-beam" />
      <div className="dla-card c1"><b>91</b><i /><span>ST</span></div>
      <div className="dla-card c2"><b>89</b><i /><span>RW</span></div>
      <div className="dla-price">£84M</div>
      <div className="dla-hwg">HERE WE GO!</div>
      <div className="dla-ticker"><span>BREAKING · DONE DEAL · BREAKING · DONE DEAL · BREAKING · DONE DEAL ·</span></div>
    </div>
  );
}
function FormArt() {
  return (
    <div className="art art-form" aria-hidden="true">
      <div className="fa-paper">
        <div className="fa-row"><span>Name</span><i /></div>
        <div className="fa-row"><span>Born</span><i className="short" /></div>
        <div className="fa-rule bad">✗ Must be a Tuesday</div>
        <div className="fa-rule bad">✗ No letter “e”</div>
        <div className="fa-rule ok">✓ Contains a fruit</div>
        <div className="fa-submit">Submit</div>
      </div>
    </div>
  );
}
function NationArt() {
  return (
    <div className="art art-nation" aria-hidden="true">
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="sea" cx="50%" cy="50%" r="70%"><stop offset="0" stopColor="#3fb8ff" /><stop offset="1" stopColor="#0a4f9e" /></radialGradient></defs>
        <rect width="320" height="200" fill="url(#sea)" />
        <g className="na-waves" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none">
          <path d="M20 40 q10 -6 20 0 t20 0" /><path d="M250 160 q10 -6 20 0 t20 0" /><path d="M260 40 q10 -6 20 0 t20 0" />
        </g>
        <path d="M70 120 C60 80 110 50 160 55 C220 58 260 85 250 125 C242 158 190 168 150 162 C100 158 78 150 70 120 Z" fill="#f2d48a" />
        <path d="M82 118 C76 86 116 64 160 67 C210 70 240 92 236 122 C230 150 188 156 152 151 C110 148 88 142 82 118 Z" fill="#41c06b" />
        <g className="na-b">
          <rect x="120" y="92" width="16" height="16" fill="#fff" /><path d="M118 92 L128 82 L138 92 Z" fill="#ff5a36" />
          <rect x="142" y="98" width="14" height="14" fill="#fff" /><path d="M140 98 L149 89 L158 98 Z" fill="#ff5a36" />
          <circle cx="182" cy="112" r="8" fill="#1f8a4c" /><circle cx="194" cy="106" r="6" fill="#1f8a4c" />
          <rect x="200" y="122" width="22" height="10" fill="#2f6bff" />
          <g className="na-turbine" style={{ transformOrigin: '110px 120px' }}><line x1="110" y1="120" x2="110" y2="102" stroke="#fff" strokeWidth="3" /><line x1="110" y1="120" x2="124" y2="128" stroke="#fff" strokeWidth="3" /><line x1="110" y1="120" x2="96" y2="128" stroke="#fff" strokeWidth="3" /></g>
          <line x1="110" y1="120" x2="110" y2="142" stroke="#fff" strokeWidth="3" />
        </g>
        <rect x="150" y="30" width="2" height="30" fill="#fff" /><path d="M152 30 h22 v14 h-22 Z" fill="#ffd400" className="na-flag" />
      </svg>
    </div>
  );
}
function AntiScamArt() {
  return (
    <div className="art art-antiscam" aria-hidden="true">
      <div className="as-hill" />
      <div className="as-win w1"><div className="as-title">Security Alert</div><div className="as-body"><b>1,337</b> viruses found!<span className="as-btn">REMOVE ALL</span></div></div>
      <div className="as-win w2"><div className="as-title">Congratulations</div><div className="as-body">You won an iPod!</div></div>
      <div className="as-wave">WAVE 3</div>
    </div>
  );
}
function SandboxArt() {
  return <div className="art art-sandbox" aria-hidden="true"><Hammer size={54} /><span>EXPERIMENTS</span></div>;
}
const ART = { deadline: DeadlineArt, form: FormArt, nation: NationArt, antiscam: AntiScamArt, sandbox: SandboxArt };

/* ---------- pieces ---------- */
function Tile({ g, onClick, locked }) {
  const Art = ART[g.art];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
  };
  const Tag = onClick ? 'button' : 'a';
  return (
    <Tag className={`tile ${locked ? 'locked' : ''}`} href={onClick ? undefined : g.href} onClick={onClick} style={{ '--tc': g.color, transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      onMouseMove={move} onMouseLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className="tile-art">{Art ? <Art /> : null}{g.tag && <span className={`tile-tag ${g.isNew ? 'new' : ''}`}>{g.tag}</span>}{locked && <span className="tile-lock"><Lock size={18} /></span>}</div>
      <div className="tile-text">
        <h2>{g.title}</h2>
        <p>{g.blurb}</p>
        <span className="tile-players">{g.players}</span>
      </div>
    </Tag>
  );
}

function useLiveCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/healthz', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (!alive) return;
      setN(Object.values(j.games || {}).reduce((t, g) => t + (g.players || 0), 0));
    }).catch(() => {});
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
  const tryCode = async () => {
    const ok = await redeem(code, MONEY.supporterCodeHashes);
    setMsg(ok ? 'Unlocked! Thanks for supporting oddball.' : 'That code didn’t work. Check the spelling.');
  };
  const Item = ({ kind, id, def }) => {
    const usable = canUse(c, kind, id), active = (kind === 'theme' ? c.theme : c.trail) === id;
    return (
      <button className={`shop-item ${active ? 'on' : ''} ${usable ? '' : 'locked'}`} disabled={!usable} onClick={() => setCosmetics(kind === 'theme' ? { theme: id } : { trail: id })}>
        {def.swatch ? <span className="swatch">{def.swatch.map((s) => <i key={s} style={{ background: s }} />)}</span> : <span className={`trail-ico t-${id}`} />}
        <b>{def.name}</b>
        <small>{active ? <><Check size={13} /> In use</> : usable ? (def.free ? 'Free' : 'Unlocked') : <><Lock size={12} /> Supporters</>}</small>
      </button>
    );
  };
  const hasCodes = MONEY.supporterCodeHashes.length > 0;
  return (
    <Modal title="Shop" onClose={onClose} wide>
      <p className="muted">Purely cosmetic. Nothing here makes you better at any game.</p>
      <h4>Site themes</h4>
      <div className="shop-grid">{Object.entries(THEMES).map(([id, def]) => <Item key={id} kind="theme" id={id} def={def} />)}</div>
      <h4>Cursor trails</h4>
      <div className="shop-grid">{Object.entries(TRAILS).map(([id, def]) => <Item key={id} kind="trail" id={id} def={def} />)}</div>
      {!c.supporter && (
        <div className="shop-unlock">
          <div><b>Supporter pack</b><span>All themes and trails, forever, on this browser.</span></div>
          {MONEY.kofiUrl && <a className="btn accent" href={MONEY.kofiUrl} target="_blank" rel="noreferrer"><Coffee size={16} /> Get a code on Ko-fi</a>}
          {hasCodes ? (
            <div className="code-row">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter supporter code" onKeyDown={(e) => { if (e.key === 'Enter') tryCode(); }} />
              <button className="btn" onClick={tryCode}>Unlock</button>
            </div>
          ) : <p className="muted small">Supporter codes aren’t on sale yet.</p>}
          {msg && <p className="muted small">{msg}</p>}
        </div>
      )}
    </Modal>
  );
}

function DevPanel({ open, onClose, focusBuilt }) {
  return (
    <aside className={`devpanel ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Dev panel">
      <div className="dp-head"><b>Dev panel</b><button className="icon" aria-label="Close dev panel" onClick={onClose}><X size={18} /></button></div>
      <section>
        <h4>Dev log</h4>
        <ol className="devlog">{DEV_LOG.map((d, i) => <li key={i}><time>{d.date}</time><span>{d.text}</span></li>)}</ol>
      </section>
      <section id="built-with" className={focusBuilt ? 'flash' : ''}>
        <h4>Built with…</h4>
        <ul className="built">{BUILT_WITH.map((b) => <li key={b.name}><a href={b.url} target="_blank" rel={b.affiliate ? 'sponsored noreferrer' : 'noreferrer'}>{b.name} <ExternalLink size={12} /></a><span>{b.what}{b.affiliate ? ' · affiliate link' : ''}</span></li>)}</ul>
      </section>
      {(MONEY.kofiUrl || MONEY.patreonUrl || MONEY.assetStoreUrl) && (
        <section>
          <h4>Support the site</h4>
          <div className="dp-links">
            {MONEY.kofiUrl && <a className="btn" href={MONEY.kofiUrl} target="_blank" rel="noreferrer"><Coffee size={16} /> Tip on Ko-fi</a>}
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
  const surprise = () => { const g = GAMES[Math.floor(Math.random() * GAMES.length)]; window.location.href = g.href; };
  const marquee = useMemo(() => [...GAMES, ...GAMES].map((g, i) => <span key={i}>{g.title}<i>✦</i></span>), []);
  return (
    <div className={`hub-wrap ${panel ? 'panel-open' : ''}`}>
      <div className="blobs" aria-hidden="true"><i /><i /><i /></div>
      <header className="topbar">
        <div className="tb-l">{SITE.contactEmail && <a className="tb-link" href={`mailto:${SITE.contactEmail}?subject=Advertise%20%2F%20sponsor%20a%20game%20on%20oddball`}><Megaphone size={15} /> Advertise / Sponsor a game</a>}</div>
        <div className="tb-r">
          {live > 0 && <span className="live"><i />{live} playing now</span>}
          <button className="tb-btn" onClick={() => setShop(true)} aria-label="Open shop"><ShoppingBag size={18} /><span>Shop</span></button>
          <button className="tb-btn" onClick={() => setPanel((p) => !p)} aria-label="Toggle dev panel" aria-expanded={panel}><PanelRight size={18} /><span>Dev panel</span></button>
        </div>
      </header>

      <main className="hub">
        <section className="hero">
          <h1 className="wordmark" aria-label={SITE.name}><Ball className="wm-ball" /><span>ddball</span></h1>
          <p className="hub-tag">{SITE.tagline}</p>
          <button className="surprise" onClick={surprise}><Shuffle size={18} /> Surprise me</button>
        </section>
        <div className="marquee" aria-hidden="true"><div className="mq-run">{marquee}{marquee}</div></div>

        <section className="tiles" aria-label="Games">
          {GAMES.map((g) => <Tile key={g.slug} g={g} />)}
          {MONEY.patreonUrl && <Tile g={{ slug: 'sandbox', title: 'The Sandbox', blurb: 'Buggy prototypes and experiments before they’re finished. For Patreon supporters.', players: 'Supporters', art: 'sandbox', color: '#d946ef', tag: 'Locked' }} locked onClick={() => setSandbox(true)} />}
          <div className="tile soon" aria-label="More games coming"><div className="tile-art soon-art"><Ball className="soon-ball" /></div><div className="tile-text"><h2>Something odd is coming</h2><p>New games land here as they’re finished.</p></div></div>
        </section>
      </main>

      <footer className="hub-foot">
        <div className="foot-l"><CarbonAd /></div>
        <div className="foot-c">
          <span>{SITE.name} — made for playing with friends</span>
          <button className="link" onClick={() => { setPanel(true); setBuilt(true); setTimeout(() => setBuilt(false), 1600); }}>Built with…</button>
        </div>
        <div className="foot-r">
          {MONEY.kofiUrl && (
            <a className="goal" href={MONEY.kofiUrl} target="_blank" rel="noreferrer" title="Chip in on Ko-fi">
              <span>{goal.label}: <b>{goal.currency}{goal.raised}/{goal.currency}{goal.goal}</b></span>
              <span className="goal-bar"><i style={{ width: `${pct}%` }} /></span>
            </a>
          )}
        </div>
      </footer>

      <DevPanel open={panel} onClose={() => setPanel(false)} focusBuilt={built} />
      {shop && <Shop onClose={() => setShop(false)} />}
      {sandbox && (
        <Modal title="The Sandbox" onClose={() => setSandbox(false)}>
          <div className="sandbox-lock"><Lock size={40} /><p>Experimental, half-finished and occasionally broken prototypes live here. Supporters on Patreon get the link to play them early.</p>
            <a className="btn accent" href={MONEY.patreonUrl} target="_blank" rel="noreferrer"><Heart size={16} /> Join on Patreon</a>
            {MONEY.assetStoreUrl && <a className="link" href={MONEY.assetStoreUrl} target="_blank" rel="noreferrer">Or grab the art and sound packs</a>}
          </div>
        </Modal>
      )}
    </div>
  );
}
