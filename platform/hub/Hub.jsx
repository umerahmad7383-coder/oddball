import React, { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import { SITE, GAMES, isNew } from '../games.js';
import { usePromo, useImpression, FooterAd, SponsorLine, linkProps, deviceClass } from '../client/promo.jsx';
import { track } from '../client/api.js';
import { BadgeIcon } from '../site/profile.jsx';
import { Mark } from '../site/mark.jsx';

/* Each game gets its own object instead of a matching card. */
function DeadlineArt() {
  return (
    <div className="obj obj-deadline" aria-hidden="true">
      <div className="dl-card"><b>91</b><span>ST</span><img src="/photos/erling-haaland.png" alt="" loading="lazy" width="96" height="96" /><em>HAALAND?</em></div>
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
const ART = { deadline: DeadlineArt, form: FormArt, nation: NationArt, antiscam: AntiScamArt };

function Game({ g }) {
  const Art = ART[g.art];
  return (
    <li className={`game g-${g.slug}`}>
      <a href={g.href}>
        {Art ? <Art /> : null}
        <h2>{g.title}{isNew(g) && <span className="new">new</span>}</h2>
        <p>{g.blurb}</p>
        <small>{g.players}</small>
      </a>
    </li>
  );
}
/* A sponsored game: same shape as the others, always labelled. */
function SponsoredGame({ item, preview }) {
  const ref = useImpression(item, preview);
  return (
    <li className={`game sponsored ${deviceClass(item)}`} ref={ref}>
      <a {...linkProps(item)}>
        <div className="obj obj-sponsored">{item.image ? <img src={item.image} alt="" loading="lazy" /> : <span>{item.title}</span>}</div>
        <h2>{item.title}<span className="ob-tag">{item.label || 'Sponsored'}</span></h2>
        <p>{item.body}</p>
        <small>A paid placement, not an oddball game.</small>
      </a>
    </li>
  );
}
function GameOfWeek({ item, preview }) {
  const ref = useImpression(item, preview);
  const g = GAMES.find((x) => x.slug === item.game);
  if (!g) return null;
  const Art = ART[g.art];
  const external = item.href && item.sponsored;
  return (
    <a className={`gotw ${deviceClass(item)}`} href={external ? item.href : g.href} ref={ref} {...(external ? { target: '_blank', rel: 'sponsored noopener noreferrer' } : {})}>
      <div className="gotw-art">{item.image ? <img src={item.image} alt="" /> : Art ? <Art /> : null}</div>
      <div className="gotw-text">
        <span className="gotw-kicker">{item.label || 'Game of the week'}{item.sponsored && item.sponsor ? ` · sponsored by ${item.sponsor}` : item.sponsored ? ' · sponsored' : ''}</span>
        <b>{g.title}</b>
        <span>{item.body || g.blurb}</span>
      </div>
    </a>
  );
}
function useJson(path) {
  const [v, set] = useState(null);
  useEffect(() => { let ok = true; fetch(path, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((j) => ok && set(j)).catch(() => {}); return () => { ok = false; }; }, [path]);
  return v;
}
function useLiveCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/healthz', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (alive) setN(Object.values(j.games || {}).reduce((t, g) => t + (g.players || 0), 0)); }).catch(() => {});
    load(); const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return n;
}

export function Hub() {
  const live = useLiveCount();
  const me = useJson('/api/me');
  const sup = useJson('/api/support'); // tells us whether coffee and advertising are actually set up
  const { items, preview } = usePromo('home');
  useEffect(() => { track('home'); }, []);
  const pick = (pl) => items.filter((i) => i.placement === pl);
  const sponsor = pick('home_sponsor')[0], footer = pick('footer')[0], gotw = pick('gotw')[0], cards = pick('sponsored_card');
  const random = () => { window.location.href = GAMES[Math.floor(Math.random() * GAMES.length)].href; };
  const card = me && me.user ? me.profile.card : null;
  return (
    <div className="page">
      <nav className="top" aria-label="Site">
        <span className="top-l">{live > 0 && <span className="live"><i aria-hidden="true" />{live} playing right now</span>}</span>
        <span className="top-r">
          <a href="/notes">notes</a>
          <a href="/support">support</a>
          {card ? <a href="/me" className="me-chip" style={{ '--acc': card.accent || 'var(--ink)' }}>{card.badge && <BadgeIcon badge={card.badge} size={15} />}{card.username}</a> : <a href="/login">sign in</a>}
        </span>
      </nav>

      <main>
        <header className="intro">
          <h1 className="wordmark" aria-label={SITE.name}><Mark className="wm-mark" /><span>ddball</span></h1>
          <p>{SITE.tagline} <button className="rand" onClick={random}>Or let fate decide.</button></p>
          <SponsorLine item={sponsor} preview={preview} />
        </header>
        {window.location.pathname !== '/' && <p className="lost" role="alert">There’s nothing at <code>{window.location.pathname}</code>. Here are the games instead.</p>}
        {gotw && <GameOfWeek item={gotw} preview={preview} />}
        <ul className="games">
          {GAMES.map((g) => <Game key={g.slug} g={g} />)}
          {cards.map((c) => <SponsoredGame key={c.id} item={c} preview={preview} />)}
        </ul>
      </main>

      <footer className="foot">
        <div className="foot-l"><FooterAd item={footer} preview={preview} /></div>
        <div className="foot-c">
          <span>{SITE.name}</span>
          <a href="/notes">notes</a>
          <a href="/supporters">supporters</a>
          {sup && sup.contact && <a href="/advertise">advertise</a>}
          <a href="/privacy">privacy</a>
        </div>
        <div className="foot-r">{sup && sup.coffee && sup.coffee.url && <a className="coffee" href="/support#coffee"><Coffee size={16} aria-hidden="true" /> Enjoying oddball? Buy us a coffee.</a>}</div>
      </footer>
    </div>
  );
}
