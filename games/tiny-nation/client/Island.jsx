import React from 'react';

/* Plot spots on the island, filled in build order. */
const PLOTS = [[300, 205], [235, 175], [365, 170], [255, 255], [345, 260], [180, 225], [420, 222], [300, 135], [205, 300], [395, 300], [150, 170], [450, 165], [300, 315], [235, 120], [370, 115], [130, 275]];
const COAST = [[476, 300], [118, 318], [490, 230]];

function Building({ k, x, y, turn }) {
  const g = (children) => <g className="bld" style={{ '--d': `${(turn % 3) * 0.05}s` }} transform={`translate(${x} ${y})`}>{children}</g>;
  switch (k) {
    case 'houses': return g(<><rect x="-22" y="-8" width="18" height="16" fill="#fff8e7" /><path d="M-24 -8 L-13 -19 L-2 -8 Z" fill="#ff6b57" /><rect x="2" y="-12" width="20" height="20" fill="#fff8e7" /><path d="M0 -12 L12 -24 L24 -12 Z" fill="#e85d4a" /><rect x="8" y="0" width="6" height="8" fill="#7a4a2a" /></>);
    case 'park': return g(<><ellipse cx="0" cy="6" rx="26" ry="10" fill="#7fe0a0" /><ellipse cx="8" cy="7" rx="9" ry="4" fill="#6ec6ff" /><circle cx="-14" cy="-6" r="9" fill="#1f8a4c" /><circle cx="-2" cy="-12" r="11" fill="#27a35a" /><rect x="-3" y="-2" width="3" height="8" fill="#7a4a2a" /></>);
    case 'school': return g(<><rect x="-22" y="-14" width="44" height="22" fill="#ffe08a" /><rect x="-6" y="-24" width="12" height="10" fill="#ffe08a" /><path d="M-8 -24 L0 -32 L8 -24 Z" fill="#c0392b" /><rect x="-16" y="-8" width="6" height="6" fill="#6ec6ff" /><rect x="10" y="-8" width="6" height="6" fill="#6ec6ff" /><rect x="-3" y="0" width="6" height="8" fill="#7a4a2a" /></>);
    case 'library': return g(<><path d="M-24 -10 L0 -24 L24 -10 Z" fill="#d9d2c3" /><rect x="-22" y="-10" width="44" height="18" fill="#efe9dc" /><rect x="-16" y="-8" width="4" height="16" fill="#cfc6b3" /><rect x="-6" y="-8" width="4" height="16" fill="#cfc6b3" /><rect x="4" y="-8" width="4" height="16" fill="#cfc6b3" /><rect x="14" y="-8" width="4" height="16" fill="#cfc6b3" /></>);
    case 'factory': return g(<><rect x="-24" y="-10" width="40" height="18" fill="#8a8f98" /><path d="M-24 -10 L-14 -18 L-14 -10 L-4 -18 L-4 -10 L6 -18 L6 -10 Z" fill="#6b707a" /><rect x="10" y="-30" width="8" height="38" fill="#5b5f68" /><g className="smoke"><circle cx="14" cy="-36" r="5" /><circle cx="18" cy="-44" r="6" /><circle cx="12" cy="-52" r="7" /></g></>);
    case 'solar': return g(<>{[-22, -6, 10].map((dx) => <g key={dx}><path d={`M${dx} -2 L${dx + 14} -10 L${dx + 14} 0 L${dx} 8 Z`} fill="#2f6bff" stroke="#bcd3ff" strokeWidth="1" /><line x1={dx + 7} y1="4" x2={dx + 7} y2="10" stroke="#555" strokeWidth="2" /></g>)}</>);
    case 'wind': return g(<>{[-12, 12].map((dx) => <g key={dx}><line x1={dx} y1="10" x2={dx} y2="-20" stroke="#fff" strokeWidth="3" /><g className="blades" style={{ transformOrigin: `${dx}px -20px` }}><line x1={dx} y1="-20" x2={dx} y2="-38" stroke="#fff" strokeWidth="3" /><line x1={dx} y1="-20" x2={dx + 16} y2="-11" stroke="#fff" strokeWidth="3" /><line x1={dx} y1="-20" x2={dx - 16} y2="-11" stroke="#fff" strokeWidth="3" /></g></g>)}</>);
    case 'tram': return g(<><line x1="-30" y1="9" x2="30" y2="9" stroke="#555" strokeWidth="2" /><line x1="-30" y1="12" x2="30" y2="12" stroke="#555" strokeWidth="2" /><g className="tram"><rect x="-16" y="-8" width="32" height="16" rx="5" fill="#ffd400" /><rect x="-12" y="-4" width="8" height="6" fill="#6ec6ff" /><rect x="0" y="-4" width="8" height="6" fill="#6ec6ff" /></g></>);
    case 'motorway': return g(<><path d="M-34 10 L34 -6 L34 6 L-34 22 Z" fill="#4b4f57" /><path d="M-30 16 L-20 13.5 M-10 11 L0 8.5 M10 6 L20 3.5" stroke="#fff" strokeWidth="2" /><g className="car"><rect x="-6" y="4" width="10" height="6" rx="2" fill="#ff5a36" /></g></>);
    case 'hospital': return g(<><rect x="-20" y="-16" width="40" height="24" fill="#fff" /><rect x="-4" y="-12" width="8" height="16" fill="#e63946" /><rect x="-10" y="-6" width="20" height="5" fill="#e63946" /></>);
    case 'stadium': return g(<><ellipse cx="0" cy="0" rx="30" ry="16" fill="#d0d4dc" /><ellipse cx="0" cy="0" rx="22" ry="10" fill="#33b864" /><line x1="0" y1="-10" x2="0" y2="10" stroke="#fff" strokeWidth="1.5" /></>);
    case 'harbour': return g(<><rect x="-6" y="-4" width="34" height="6" fill="#a0703f" /><g className="boat"><path d="M8 10 L30 10 L26 18 L12 18 Z" fill="#ff5a36" /><line x1="19" y1="10" x2="19" y2="-6" stroke="#fff" strokeWidth="2" /><path d="M19 -6 L29 6 L19 6 Z" fill="#fff" /></g></>);
    case 'museum': return g(<><rect x="-20" y="-8" width="40" height="16" fill="#efe9dc" /><path d="M-14 -8 A14 14 0 0 1 14 -8 Z" fill="#7fb7ff" /><rect x="-2" y="0" width="5" height="8" fill="#7a4a2a" /><circle cx="0" cy="-22" r="3" fill="#ffd400" /></>);
    default: return null;
  }
}

export function Flag({ f, w = 60 }) {
  const h = w * 0.66;
  return (
    <svg width={w} height={h} viewBox="0 0 60 40" className="flag" aria-hidden="true">
      <rect width="60" height="40" fill={f.a} />
      {f.layout === 'h' && <><rect y="13.3" width="60" height="13.4" fill={f.b} /><rect y="26.7" width="60" height="13.3" fill={f.c} /></>}
      {f.layout === 'v' && <><rect x="20" width="20" height="40" fill={f.b} /><rect x="40" width="20" height="40" fill={f.c} /></>}
      {f.layout === 'diag' && <><path d="M0 40 L60 0 L60 40 Z" fill={f.b} /><path d="M0 40 L60 0" stroke={f.c} strokeWidth="6" /></>}
      {f.layout === 'cross' && <><rect x="18" width="8" height="40" fill={f.b} /><rect y="16" width="60" height="8" fill={f.b} /></>}
      {f.layout === 'circle' && <circle cx="30" cy="20" r="11" fill={f.b} />}
      {f.emblem === 'star' && <path d="M30 11 L32.6 17.6 L39.5 17.8 L34 22 L36 28.8 L30 24.8 L24 28.8 L26 22 L20.5 17.8 L27.4 17.6 Z" fill={f.c} />}
      {f.emblem === 'circle' && <circle cx="30" cy="20" r="6" fill={f.c} />}
      {f.emblem === 'goose' && <path d="M24 26 Q22 18 30 18 Q33 12 37 14 L41 14 L37 16 Q34 16 34 20 Q36 27 28 28 Z" fill={f.c} />}
      {f.emblem === 'wave' && <path d="M14 22 q4 -6 8 0 t8 0 t8 0 t8 0" stroke={f.c} strokeWidth="3" fill="none" />}
    </svg>
  );
}

export function Island({ s, flag }) {
  const green = s.green, land = `hsl(${60 + green * 0.8} ${35 + green * 0.35}% ${42 + green * 0.08}%)`;
  const smog = Math.max(0, (50 - green) / 50) * 0.55;
  const traffic = s.commute >= 30;
  let plot = 0, coast = 0;
  const placed = s.plots.map((p, i) => {
    let xy;
    if (p.key === 'harbour' && coast < COAST.length) xy = COAST[coast++]; else xy = PLOTS[plot++ % PLOTS.length];
    return <Building key={i} k={p.key} x={xy[0]} y={xy[1]} turn={p.turn} />;
  });
  return (
    <svg className="island" viewBox="0 0 600 420" role="img" aria-label={`Map of ${s.name}`}>
      <defs>
        <radialGradient id="sea2" cx="50%" cy="45%" r="70%"><stop offset="0" stopColor="#5cc8ff" /><stop offset="1" stopColor="#1167c9" /></radialGradient>
        <radialGradient id="smog" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor="#7a6f5c" stopOpacity="0.9" /><stop offset="1" stopColor="#7a6f5c" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="600" height="420" fill="url(#sea2)" />
      <g className="waves" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M40 60 q12 -8 24 0 t24 0" /><path d="M500 50 q12 -8 24 0 t24 0" /><path d="M520 370 q12 -8 24 0 t24 0" /><path d="M50 380 q12 -8 24 0 t24 0" />
      </g>
      <path d="M95 230 C80 140 170 80 300 78 C430 76 525 140 505 235 C490 320 410 365 300 362 C190 360 108 320 95 230 Z" fill="#f2d48a" />
      <path d="M112 228 C100 150 180 98 300 96 C420 94 498 152 488 232 C476 308 402 345 300 342 C196 340 124 306 112 228 Z" fill={land} style={{ transition: 'fill 1s' }} />
      {traffic && <path className="road" d="M120 250 C200 230 260 270 320 240 S440 200 486 226" stroke="#4b4f57" strokeWidth="9" fill="none" strokeLinecap="round" />}
      {traffic && Array.from({ length: Math.min(8, Math.round((s.commute - 25) / 4)) }, (_, i) => <circle key={i} r="4" fill={['#ff5a36', '#ffd400', '#fff', '#2f6bff'][i % 4]} className="car-dot"><animateMotion dur={`${6 + (i % 3)}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" path="M120 250 C200 230 260 270 320 240 S440 200 486 226" /></circle>)}
      {placed}
      <g transform="translate(470 92)"><line x1="0" y1="0" x2="0" y2="34" stroke="#fff" strokeWidth="2.5" /><g className="flag-wave" transform="translate(1 -1)"><Flag f={flag} w={34} /></g></g>
      {smog > 0 && <ellipse cx="300" cy="220" rx="260" ry="170" fill="url(#smog)" opacity={smog} style={{ transition: 'opacity 1s' }} />}
      <text x="300" y="404" textAnchor="middle" className="isle-name">{s.name}</text>
    </svg>
  );
}
