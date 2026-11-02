/* Shared by the browser client and the Node server. Keep this file dependency-free. */
export const GAME_LEN = 180;
export const WAVE_EVERY = 15;
export const FIRST_WAVE = 3;
export const TOTAL_WAVES = 12;
export const START_MONEY = 5000;
export const START_CPU = 40;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const COUNTDOWN_MS = 4000;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const COLORS = ['#22e6ff', '#ff2bd6', '#b6ff3b', '#ffb020'];
export const EMOTES = ['😂', '💀', '🔥', '🤡', '😱', '👋'];

/* Versus: spend charges to sabotage opponents. */
export const SABOTAGES = {
  kevin: { name: 'Send Kevin', cost: 1, icon: 'Phone', desc: 'A tech support scammer calls them.' },
  storm: { name: 'Pop-up Storm', cost: 1, icon: 'Gift', desc: 'Three prize pop-ups at once.' },
  fakewarn: { name: 'Fake Warnings', cost: 1, icon: 'AlertTriangle', desc: 'Their HUD lies for 5 seconds.' },
  bsod: { name: 'Blue Screen', cost: 1, icon: 'Monitor', desc: 'Blinds them for 2.5 seconds.' },
  flip: { name: 'Upside Down', cost: 2, icon: 'RotateCcw', desc: 'Flips their desktop for 7 seconds.' },
  heat: { name: 'Heat Wave', cost: 2, icon: 'Flame', desc: '+10°C and their fan breaks for 8 seconds.' },
  shill: { name: 'Crypto Shill', cost: 2, icon: 'Bitcoin', desc: 'Forces a crypto exchange open.' },
  firewall: { name: 'Firewall', cost: 1, icon: 'ShieldCheck', desc: 'Blocks the next sabotage aimed at you.', self: true },
};
/* Co-op: spend charges to help the team. */
export const ASSISTS = {
  nitrogen: { name: 'Liquid Nitrogen', cost: 1, icon: 'Snowflake', desc: 'Shared CPU −12°C.', self: true },
  sweep: { name: 'Sweep Teammate', cost: 1, icon: 'Sparkles', desc: 'Closes a scam on a teammate’s screen.' },
  funds: { name: 'Emergency Funds', cost: 2, icon: 'DollarSign', desc: 'Shared bank +$600.', self: true },
};
export const MAX_CHARGES = 3;
export const ENERGY_PER_CHARGE = 2;

export const GLOBAL_EVENTS = {
  heatwave: { name: 'Global Heatwave', desc: 'Everyone +10°C. Fans run at half power for 15s.', good: false },
  callcenter: { name: 'Kevin’s Call Center Opens', desc: 'Everyone gets a tech support call.', good: false },
  frenzy: { name: 'Crypto Frenzy', desc: 'Everyone gets a crypto exchange.', good: false },
  update: { name: 'Forced Windows Update', desc: 'Everyone is stuck on an update screen for 5 seconds.', good: false },
  surge: { name: 'Power Surge', desc: 'Everyone’s windows get scrambled.', good: false },
  glitch: { name: 'Bank Glitch', desc: 'Everyone gets $300. The bank is confused.', good: true },
  breeze: { name: 'Cold Front', desc: 'Everyone −15°C. Ahh.', good: true },
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rshuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rweighted(opts, r) { const tot = opts.reduce((t, o) => t + o[1], 0); let x = r() * tot; for (const o of opts) { x -= o[1]; if (x <= 0) return o[0]; } return opts[opts.length - 1][0]; }

/* Same seed -> same scam types at the same moments for every player in a room. */
export function makeWavePlan(seed) {
  const r = mulberry32(seed);
  const queue = rshuffle(['download', 'tech', 'crypto', 'antivirus', 'overload'], r);
  const plan = [];
  for (let w = 1; w <= TOTAL_WAVES; w++) {
    const t = FIRST_WAVE + (w - 1) * WAVE_EVERY;
    const n = w === TOTAL_WAVES ? 2 : t < 60 ? 1 : t < 120 ? (r() < 0.55 ? 2 : 1) : 2;
    const types = [];
    for (let i = 0; i < n; i++) types.push(queue.length ? queue.shift() : rweighted([['download', 3], ['tech', 2.5], ['antivirus', 2.5], ['crypto', 1.6], ['overload', 2]], r));
    plan.push(types);
  }
  return plan;
}

/* Three global events per round, at least one of them good. */
export function scheduleGlobals(seed) {
  const r = mulberry32(seed ^ 0x5bd1e995);
  const bad = rshuffle(Object.keys(GLOBAL_EVENTS).filter((k) => !GLOBAL_EVENTS[k].good), r);
  const good = rshuffle(Object.keys(GLOBAL_EVENTS).filter((k) => GLOBAL_EVENTS[k].good), r);
  const kinds = rshuffle([bad[0], bad[1], good[0]], r);
  const slots = [[36, 50], [82, 98], [126, 144]];
  return kinds.map((kind, i) => ({ kind, at: Math.round(slots[i][0] + r() * (slots[i][1] - slots[i][0])) }));
}

export function computeScore(survival, money, defeated, won) {
  const s = Math.min(GAME_LEN, Math.max(0, survival));
  const survivalPts = Math.floor(s) * 10 + (won ? 1500 : 0);
  const moneyPts = Math.round(Math.max(0, money) * (s / GAME_LEN));
  const scamPts = defeated * 250;
  return { survivalPts, moneyPts, scamPts, score: survivalPts + moneyPts + scamPts };
}

export function cleanName(n, fallback = 'Player') {
  const s = String(n || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return s || fallback;
}
