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
  thud() {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t = c.currentTime, len = Math.floor(c.sampleRate * 0.18), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    const g = c.createGain(); g.gain.value = 0.5; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  },
  play(n) {
    try {
      switch (n) {
        case 'bid': this.tone(660, 0.08, 'triangle', 0.08); this.tone(990, 0.1, 'triangle', 0.06, null, 0.05); break;
        case 'mybid': this.tone(523, 0.07, 'square', 0.05); this.tone(784, 0.12, 'square', 0.05, null, 0.06); break;
        case 'tick': this.tone(1400, 0.03, 'square', 0.03); break;
        case 'reveal': this.tone(220, 0.35, 'sine', 0.06, 660); break;
        case 'gavel': this.thud(); this.tone(140, 0.2, 'sine', 0.12, 70); break;
        case 'won': this.thud(); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.07, null, 0.1 + i * 0.08)); break;
        case 'unsold': this.tone(330, 0.25, 'sine', 0.06, 200); break;
        case 'error': this.tone(200, 0.15, 'sawtooth', 0.05); break;
        case 'whistle': this.tone(2200, 0.18, 'sine', 0.06, 2000); this.tone(2200, 0.4, 'sine', 0.06, 1900, 0.22); break;
        default: break;
      }
    } catch (e) { /* ignore */ }
  },
};

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
export const GROUP_COLOR = { GK: '#f59e0b', DEF: '#2f6bff', MID: '#16a34a', ATT: '#ff4b3e' };
const groupOf = (pos) => (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(pos) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos) ? 'MID' : 'ATT');

/* Illustrated portrait — or the footballer's photo if one was supplied in players.js */
export function Portrait({ f }) {
  const [broken, setBroken] = useState(false);
  if (f.photo && !broken) return <img className="portrait-img" src={f.photo} alt="" onError={() => setBroken(true)} />;
  const h = clubHue(f.club), skin = ['#f1c7a5', '#d9a07a', '#a86b45', '#7a4a2a', '#5a3620'][hash(f.name) % 5];
  return (
    <svg className="portrait" viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id={`k${f.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={`hsl(${h} 70% 52%)`} /><stop offset="1" stopColor={`hsl(${h} 70% 38%)`} /></linearGradient></defs>
      <circle cx="50" cy="50" r="50" fill={`hsl(${h} 45% 92%)`} />
      <path d="M10 100 C14 76 30 68 50 68 C70 68 86 76 90 100 Z" fill={`url(#k${f.id})`} />
      <path d="M40 68 L50 80 L60 68" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="50" cy="42" rx="17" ry="20" fill={skin} />
      <text x="50" y="96" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="'Big Shoulders Display', sans-serif">{initials(f.name)}</text>
    </svg>
  );
}

export function PlayerCard({ f, size = 'lg', flipped = false, tag }) {
  if (!f) return null;
  const tier = tierOf(f.rating);
  return (
    <div className={`pcard-wrap ${size} ${flipped ? 'flipped' : ''}`}>
      <div className="pcard-inner">
        <div className={`pcard front tier-${tier}`}>
          <div className="pc-top">
            <div className="pc-rating"><b>{f.rating}</b><span style={{ color: GROUP_COLOR[groupOf(f.pos)] }}>{f.pos}</span></div>
            <span className="pc-nation" title={NATIONS[f.nation]}>{f.nation}</span>
          </div>
          <div className="pc-portrait"><Portrait f={f} /></div>
          <div className="pc-name">{f.name}</div>
          <div className="pc-meta"><span>{f.club}</span><span>{LEAGUES[f.league] || 'Academy'}</span></div>
          {size === 'lg' && <div className="pc-nat-full">{NATIONS[f.nation]}</div>}
          {tag && <div className="pc-tag">{tag}</div>}
          {tier === 'elite' && <div className="pc-shine" aria-hidden="true" />}
        </div>
        <div className="pcard back" aria-hidden="true"><div className="pc-back-logo"><span>DEADLINE</span><span>DAY</span></div></div>
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
  useEffect(() => { if (value !== prev.current) { setPop(true); const t = setTimeout(() => setPop(false), 300); prev.current = value; return () => clearTimeout(t); } return undefined; }, [value]);
  return <span className={`money ${pop ? 'pop' : ''} ${className}`}>{fmtM(value)}</span>;
}

/* ---------- pitch ---------- */
const LINK_COLOR = ['rgba(255,255,255,0.22)', '#ffd84d', '#9be15d', '#3dff8a'];
export function Pitch({ formation, lineup, lookup, editable, selected, onSlot, compact }) {
  const form = FORMATIONS[formation];
  const ev = evaluate(formation, lineup, lookup);
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
          return <line key={`${l.a}-${l.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={both ? LINK_COLOR[Math.min(3, l.s)] : 'rgba(255,255,255,0.12)'} strokeWidth={l.s >= 2 ? 1.1 : 0.7} strokeDasharray={both && l.s ? 'none' : '1.5 1.5'} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {form.slots.map((slot, i) => {
        const p = ev.players[i], f = p.f;
        const cls = ['tok', f ? `fit-${p.fit}` : 'empty', selected === i ? 'sel' : '', editable ? 'edit' : ''].join(' ');
        const body = (
          <>
            {f ? (
              <>
                <div className="tok-face"><span className="tok-pic"><Portrait f={f} /></span><b className={p.eff < f.rating ? 'down' : ''} title={p.eff < f.rating ? `${f.rating} base, ${p.eff} here` : `${f.rating}`}>{p.eff}</b></div>
                <div className="tok-name">{shortName(f.name)}</div>
                {!compact && <div className="tok-chem" title="Chemistry">{Array.from({ length: 5 }, (_, k) => <i key={k} className={k < Math.round(p.chem / 2) ? 'on' : ''} />)}</div>}
              </>
            ) : <div className="tok-empty">+</div>}
            <span className="tok-pos">{slot.pos}</span>
          </>
        );
        return editable
          ? <button key={i} className={cls} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onClick={() => onSlot && onSlot(i)} aria-label={f ? `${f.name} at ${slot.pos}` : `Empty ${slot.pos} slot`}>{body}</button>
          : <div key={i} className={cls} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>{body}</div>;
      })}
    </div>
  );
}
export const fitLabel = (pos, slot) => ({ natural: 'Natural position', related: 'Similar position (−3)', line: 'Same line (−7)', out: 'Out of position' }[fit(pos, slot)]);

export function Confetti() {
  const bits = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#ffc93c', '#ff4b3e', '#3dff8a', '#2f6bff', '#fff'][i % 5], animationDelay: `${(i % 9) * 0.04}s`, '--dx': `${((i * 53) % 120) - 60}px` }} />)}
    </div>
  );
}
