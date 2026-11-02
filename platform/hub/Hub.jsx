import React from 'react';
import { SITE, GAMES } from '../games.js';

function Ball({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="currentColor" />
      <path d="M50 22 L66 34 L60 53 L40 53 L34 34 Z" fill="var(--paper)" />
      <path d="M50 6 L50 22 M66 34 L86 28 M60 53 L72 72 M40 53 L28 72 M34 34 L14 28" stroke="var(--paper)" strokeWidth="4" />
    </svg>
  );
}

function DeadlineArt() {
  return (
    <div className="art art-deadline" aria-hidden="true">
      <div className="dl-stripes" />
      <div className="dl-card"><b>91</b><span>ST</span><i /><em>£84M</em></div>
      <div className="dl-card back"><b>88</b><span>CM</span><i /><em>£61M</em></div>
      <div className="dl-stamp">SOLD</div>
      <svg className="dl-gavel" viewBox="0 0 120 120"><g transform="rotate(-35 60 60)"><rect x="30" y="30" width="60" height="26" rx="6" fill="#ffd400" /><rect x="22" y="34" width="10" height="18" rx="3" fill="#e6b800" /><rect x="88" y="34" width="10" height="18" rx="3" fill="#e6b800" /><rect x="55" y="54" width="10" height="56" rx="4" fill="#7a4a1f" /></g></svg>
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
const ART = { deadline: DeadlineArt, antiscam: AntiScamArt };

export function Hub() {
  return (
    <main className="hub">
      <header className="hub-head">
        <h1 className="wordmark" aria-label={SITE.name}><Ball className="wm-ball" /><span>ddball</span></h1>
        <p className="hub-tag">{SITE.tagline}</p>
      </header>
      <section className="tiles" aria-label="Games">
        {GAMES.map((g) => {
          const Art = ART[g.art];
          return (
            <a key={g.slug} className={`tile t-${g.slug}`} href={g.href}>
              <div className="tile-art">{Art ? <Art /> : null}{g.isNew && <span className="tile-new">New</span>}</div>
              <div className="tile-text">
                <h2>{g.title}</h2>
                <p>{g.blurb}</p>
                <span className="tile-players">{g.players}</span>
              </div>
            </a>
          );
        })}
        <div className="tile soon" aria-label="More games coming">
          <div className="tile-art soon-art"><Ball className="soon-ball" /></div>
          <div className="tile-text"><h2>Something odd is coming</h2><p>New games land here as they’re finished.</p></div>
        </div>
      </section>
      <footer className="hub-foot">{SITE.name} — made for playing with friends</footer>
    </main>
  );
}
