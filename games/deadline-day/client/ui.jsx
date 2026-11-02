import React, { useEffect, useRef, useState } from 'react';
import { NATIONS, LEAGUES } from '../shared/players.js';
import { FORMATIONS, evaluate, fit } from '../shared/tactics.js';
import { fmtM } from '../shared/rules.js';

/* ---------- sound ---------- */
export const Sound = {
  ctx: null, muted: false,
  init() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { /* no audio */ } },
  tone(f, d, type = 'sine', v = 0.08, f2 = null, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d = 0.18, v = 0.5, freq = 600) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, len = Math.floor(c.sampleRate * d), b = c.createBuffer(1, len, c.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  },
  play(n) {
    try {
      switch (n) {
        case 'bid': this.tone(660, 0.08, 'triangle', 0.08); this.tone(990, 0.1, 'triangle', 0.06, null, 0.05); break;
        case 'mybid': this.tone(523, 0.07, 'square', 0.05); this.tone(784, 0.12, 'square', 0.05, null, 0.06); break;
        case 'tick': this.tone(1400, 0.03, 'square', 0.03); break;
        case 'beat': this.tone(70, 0.12, 'sine', 0.25, 50); break;
        case 'reveal': this.tone(180, 0.5, 'sawtooth', 0.035, 720); this.tone(1200, 0.25, 'sine', 0.04, 1600, 0.45); break;
        case 'gavel': this.noise(0.18, 0.6); this.tone(140, 0.2, 'sine', 0.12, 70); break;
        case 'won': this.noise(0.18, 0.6); [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.07, null, 0.1 + i * 0.08)); break;
        case 'unsold': this.tone(330, 0.3, 'sine', 0.06, 180); break;
        case 'breaking': [880, 1175, 880, 1175].forEach((f, i) => this.tone(f, 0.12, 'square', 0.035, null, i * 0.13)); break;
        case 'error': this.tone(200, 0.15, 'sawtooth', 0.05); break;
        case 'click': this.tone(1200, 0.03, 'square', 0.025); break;
        case 'whistle': this.tone(2200, 0.18, 'sine', 0.06, 2000); this.tone(2200, 0.45, 'sine', 0.06, 1900, 0.22); break;
        default: break;
      }
    } catch (e) { /* ignore */ }
  },
};

/* ---------- photos dropped into public/photos/ ---------- */
let photoIndex = null; const photoListeners = new Set();
function loadPhotos() {
  if (photoIndex) return;
  photoIndex = { files: {}, credits: false, loading: true };
  fetch('/photos/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => { photoIndex = j || { files: {}, credits: false }; photoListeners.forEach((f) => f()); })
    .catch(() => { photoIndex = { files: {}, credits: false }; });
}
export function usePhotos() {
  const [, bump] = useState(0);
  useEffect(() => { loadPhotos(); const fn = () => bump((x) => x + 1); photoListeners.add(fn); return () => photoListeners.delete(fn); }, []);
  return photoIndex || { files: {}, credits: false };
}
const photoUrl = (id) => (photoIndex && photoIndex.files[id] ? `/photos/${encodeURIComponent(photoIndex.files[id])}` : null);

/* ---------- helpers ---------- */
export function useNow(net, every = 100) {
  const [t, setT] = useState(() => (net ? net.now() : Date.now()));
  useEffect(() => { const id = setInterval(() => setT(net ? net.now() : Date.now()), every); return () => clearInterval(id); }, [net, every]);
  return t;
}
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
export const clubHue = (club) => (club === 'Academy' ? 140 : hash(club) % 360);
export const tierOf = (r) => (r >= 88 ? 'elite' : r >= 84 ? 'gold' : r >= 79 ? 'silver' : 'bronze');
export const shortName = (n) => { const p = n.split(' '); return p.length > 1 && n.length > 11 ? p.slice(1).join(' ') : n; };
const initials = (n) => n.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const groupOf = (pos) => (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(pos) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos) ? 'MID' : 'ATT');
export const GROUP_COLOR = { GK: '#ffb020', DEF: '#4d8dff', MID: '#2ee59d', ATT: '#ff5470' };

/* Transfer-announcement silhouette in club colours, or the player's photo if one was dropped into public/photos. */
export function Portrait({ f }) {
  usePhotos();
  const [broken, setBroken] = useState(false);
  const src = !f.academy && photoUrl(f.id);
  if (src && !broken) return <img className="portrait-img" src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
  const h = clubHue(f.club), gid = `g${f.id}`;
  return (
    <svg className="portrait" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`${gid}b`} cx="50%" cy="30%" r="75%"><stop offset="0" stopColor={`hsl(${h} 85% 58%)`} /><stop offset="0.55" stopColor={`hsl(${h} 70% 30%)`} /><stop offset="1" stopColor={`hsl(${h} 60% 12%)`} /></radialGradient>
        <linearGradient id={`${gid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b0f22" /><stop offset="1" stopColor="#05070f" /></linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid}b)`} />
      <g opacity="0.18" stroke="#fff" strokeWidth="0.6">{Array.from({ length: 9 }, (_, i) => <line key={i} x1={i * 12.5} y1="0" x2={i * 12.5 - 30} y2="100" />)}</g>
      <path d="M8 104 C10 82 26 72 40 69 L44 62 C36 58 31 49 31 39 C31 25 39 16 50 16 C61 16 69 25 69 39 C69 49 64 58 56 62 L60 69 C74 72 90 82 92 104 Z" fill={`url(#${gid}s)`} stroke={`hsl(${h} 95% 70%)`} strokeWidth="1" />
      <text x="50" y="94" textAnchor="middle" fontSize="13" fontWeight="900" fill={`hsl(${h} 95% 72%)`} fontFamily="'Big Shoulders Display', Impact, sans-serif" letterSpacing="1">{initials(f.name)}</text>
    </svg>
  );
}

export function PlayerCard({ f, size = 'lg', flipped = false, tag, price }) {
  if (!f) return null;
  const tier = tierOf(f.rating);
  return (
    <div className={`pcard-wrap ${size} ${flipped ? 'flipped' : ''}`}>
      <div className="pcard-inner">
        <div className={`pcard front tier-${tier}`}>
          <div className="pc-art"><Portrait f={f} /></div>
          <div className="pc-shade" aria-hidden="true" />
          <div className="pc-rating"><b>{f.rating}</b><span style={{ color: GROUP_COLOR[groupOf(f.pos)] }}>{f.pos}</span></div>
          <span className="pc-nation" title={NATIONS[f.nation]}>{f.nation}</span>
          <div className="pc-foot">
            <div className="pc-name">{f.name}</div>
            <div className="pc-meta"><span>{f.club}</span>{size !== 'sm' && <span className="dim">{LEAGUES[f.league] || 'Academy'} · {NATIONS[f.nation]}</span>}</div>
          </div>
          {price != null && <div className="pc-price">{fmtM(price)}</div>}
          {tag && <div className="pc-tag">{tag}</div>}
          {tier === 'elite' && <div className="pc-shine" aria-hidden="true" />}
        </div>
        <div className="pcard back" aria-hidden="true"><div className="pc-back-logo"><span>DEADLINE</span><span>DAY</span></div><div className="pc-back-q">?</div></div>
      </div>
    </div>
  );
}

export function TimerRing({ remaining, total, label, hot }) {
  const frac = Math.max(0, Math.min(1, remaining / total));
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div className={`timer-ring ${hot ? 'hot' : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <div className={`ring-label ${typeof label === 'number' ? '' : 'word'}`}>{label}</div>
    </div>
  );
}

export function Money({ value, className = '' }) {
  const prev = useRef(value); const [pop, setPop] = useState(false);
  useEffect(() => { if (value !== prev.current) { setPop(true); const t = setTimeout(() => setPop(false), 350); prev.current = value; return () => clearTimeout(t); } return undefined; }, [value]);
  return <span className={`money ${pop ? 'pop' : ''} ${className}`}>{fmtM(value)}</span>;
}

/* ---------- pitch ---------- */
const LINK_COLOR = ['rgba(255,255,255,0.18)', '#ffd84d', '#9be15d', '#3dff8a'];
export function Pitch({ formation, lineup, lookup, editable, selected, onSlot, onSwap, compact, ghost }) {
  const form = FORMATIONS[formation];
  const ev = evaluate(formation, lineup, lookup);
  // drag a player onto another spot to swap them (tap-to-swap still works)
  const drag = useRef(null);
  const [dragFrom, setDragFrom] = useState(null), [over, setOver] = useState(null);
  useEffect(() => {
    if (!editable) return undefined;
    const slotAt = (x, y) => { const el = document.elementFromPoint(x, y); const s = el && el.closest('[data-slot]'); return s ? Number(s.dataset.slot) : null; };
    const move = (e) => {
      const d = drag.current; if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) { d.moved = true; setDragFrom(d.from); }
      if (d.moved) setOver(slotAt(e.clientX, e.clientY));
    };
    const up = (e) => {
      const d = drag.current; drag.current = null;
      if (d && d.moved) {
        const to = slotAt(e.clientX, e.clientY);
        if (to != null && to !== d.from && onSwap) onSwap(d.from, to);
        d.suppress = true; setTimeout(() => { d.suppress = false; }, 0);
        lastDrag.current = Date.now();
      }
      setDragFrom(null); setOver(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [editable, onSwap]);
  const lastDrag = useRef(0);
  return (
    <div className={`pitch ${compact ? 'compact' : ''}`}>
      <svg className="pitch-lines" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
        <rect x="3" y="3" width="94" height="124" rx="1" />
        <line x1="3" y1="65" x2="97" y2="65" /><circle cx="50" cy="65" r="11" />
        <rect x="26" y="3" width="48" height="18" /><rect x="26" y="109" width="48" height="18" />
        <rect x="39" y="3" width="22" height="7" /><rect x="39" y="120" width="22" height="7" />
      </svg>
      <svg className="pitch-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {ev.links.map((l) => {
          const a = form.slots[l.a], b = form.slots[l.b];
          const both = ev.players[l.a].f && ev.players[l.b].f;
          return <line key={`${l.a}-${l.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={both ? LINK_COLOR[Math.min(3, l.s)] : 'rgba(255,255,255,0.1)'} strokeWidth={l.s >= 2 ? 1.2 : 0.7} strokeDasharray={both && l.s ? 'none' : '1.5 1.5'} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {form.slots.map((slot, i) => {
        const p = ev.players[i], f = p.f;
        const isGhost = ghost && ghost.slot === i;
        const cls = ['tok', f ? `fit-${p.fit}` : 'empty', selected === i ? 'sel' : '', editable ? 'edit' : '', isGhost ? 'ghosted' : '', dragFrom === i ? 'dragging' : '', dragFrom != null && over === i && over !== dragFrom ? 'drop' : ''].join(' ');
        const body = (
          <>
            {f ? (
              <>
                <div className="tok-face"><span className="tok-pic"><Portrait f={f} /></span><b className={p.eff < f.rating ? 'down' : ''} title={p.eff < f.rating ? `${f.rating} base, ${p.eff} here` : `${f.rating}`}>{p.eff}</b></div>
                <div className="tok-name">{shortName(f.name)}</div>
                {!compact && <div className="tok-chem" title="Chemistry">{Array.from({ length: 5 }, (_, k) => <i key={k} className={k < Math.round(p.chem / 2) ? 'on' : ''} />)}</div>}
              </>
            ) : isGhost ? (
              <>
                <div className="tok-face ghost"><span className="tok-pic"><Portrait f={ghost.f} /></span><b>{ghost.eff}</b></div>
                <div className="tok-name ghost">{shortName(ghost.f.name)}?</div>
              </>
            ) : <div className="tok-empty">+</div>}
            <span className="tok-pos">{slot.pos}</span>
          </>
        );
        return editable
          ? <button key={i} data-slot={i} className={cls} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onPointerDown={(e) => { if (f) drag.current = { from: i, x: e.clientX, y: e.clientY, moved: false }; }} onClick={() => { if (Date.now() - lastDrag.current < 250) return; if (onSlot) onSlot(i); }} aria-label={f ? `${f.name} at ${slot.pos}` : `Empty ${slot.pos} slot`}>{body}</button>
          : <div key={i} className={cls} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>{body}</div>;
      })}
    </div>
  );
}
export const fitLabel = (pos, slot) => ({ natural: 'natural position', related: 'similar position (−3)', line: 'same line (−7)', out: 'out of position' }[fit(pos, slot)]);

export function Confetti({ n = 44 }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#ffe14d', '#ff3d5a', '#3dff8a', '#4d8dff', '#fff'][i % 5], animationDelay: `${(i % 11) * 0.035}s`, '--dx': `${((i * 53) % 160) - 80}px`, '--rot': `${(i * 97) % 720}deg` }} />)}
    </div>
  );
}

/* The yellow rolling news strip. */
export function Ticker({ items }) {
  if (!items.length) return null;
  const line = items.map((x, i) => <span key={i} className="tk-item"><i>●</i>{x}</span>);
  const dur = Math.max(18, items.join(' ').length * 0.16);
  return (
    <div className="ticker" aria-label="Latest news">
      <div className="tk-label">DEADLINE DAY <b>LIVE</b></div>
      <div className="tk-track"><div className="tk-run" style={{ animationDuration: `${dur}s` }}>{line}{line}</div></div>
    </div>
  );
}
