/* Deadline Day — formations, effective ratings and chemistry. Pure functions, shared by client and server. */
import { finalScore } from './rules.js';

export const GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'ATT', RW: 'ATT', ST: 'ATT' };
/* Wide midfield and wide attack are the same job for this game. */
const SAME = { LM: 'LW', LW: 'LM', RM: 'RW', RW: 'RM' };
/* Realistic neighbours only: a winger is never "nearly" a full-back. */
const RELATED = {
  CB: ['CDM'], LB: ['LM'], RB: ['RM'], CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'],
  CAM: ['CM', 'ST'], LM: ['LB', 'CM'], RM: ['RB', 'CM'], LW: ['ST', 'CAM'], RW: ['ST', 'CAM'], ST: ['CAM', 'LW', 'RW'], GK: [],
};
/** How well a footballer's position fits a slot: 'natural' | 'related' | 'line' | 'out'. */
export function fit(pos, slot) {
  if (pos === slot || SAME[pos] === slot) return 'natural';
  if (pos === 'GK' || slot === 'GK') return 'out';
  if (RELATED[pos] && RELATED[pos].includes(slot)) return 'related';
  if (GROUP[pos] === GROUP[slot]) return 'line';
  return 'out';
}
export const PENALTY = { natural: 0, related: 3, line: 7, out: 15 };
export const FIT_CHEM = { natural: 4, related: 2, line: 0, out: 0 };
export function effective(f, slot) {
  if (!f) return 0;
  const k = fit(f.pos, slot);
  const pen = (f.pos === 'GK') !== (slot === 'GK') ? 40 : PENALTY[k];
  return Math.max(1, f.rating - pen);
}

/* x: 0 (left) → 100 (right); y: 0 (attack) → 100 (own goal) */
const F = (label, mode, slots) => ({ label, mode, slots: slots.map(([pos, x, y]) => ({ pos, x, y })) });
export const FORMATIONS = {
  '4-3-3': F('4-3-3', 'classic', [['GK', 50, 91], ['LB', 13, 70], ['CB', 37, 76], ['CB', 63, 76], ['RB', 87, 70], ['CM', 28, 47], ['CM', 50, 52], ['CM', 72, 47], ['LW', 17, 20], ['ST', 50, 13], ['RW', 83, 20]]),
  '4-4-2': F('4-4-2', 'classic', [['GK', 50, 91], ['LB', 13, 70], ['CB', 37, 76], ['CB', 63, 76], ['RB', 87, 70], ['LM', 13, 44], ['CM', 37, 50], ['CM', 63, 50], ['RM', 87, 44], ['ST', 37, 15], ['ST', 63, 15]]),
  '4-2-3-1': F('4-2-3-1', 'classic', [['GK', 50, 91], ['LB', 13, 72], ['CB', 37, 78], ['CB', 63, 78], ['RB', 87, 72], ['CDM', 36, 56], ['CDM', 64, 56], ['LW', 16, 31], ['CAM', 50, 34], ['RW', 84, 31], ['ST', 50, 11]]),
  '3-5-2': F('3-5-2', 'classic', [['GK', 50, 91], ['CB', 26, 75], ['CB', 50, 78], ['CB', 74, 75], ['LM', 10, 44], ['CM', 32, 48], ['CDM', 50, 58], ['CM', 68, 48], ['RM', 90, 44], ['ST', 37, 15], ['ST', 63, 15]]),
  '3-4-3': F('3-4-3', 'classic', [['GK', 50, 91], ['CB', 26, 75], ['CB', 50, 78], ['CB', 74, 75], ['LM', 12, 47], ['CM', 37, 52], ['CM', 63, 52], ['RM', 88, 47], ['LW', 20, 19], ['ST', 50, 12], ['RW', 80, 19]]),
  '2-3-1': F('2-3-1', 'quick', [['GK', 50, 90], ['CB', 32, 72], ['CB', 68, 72], ['LM', 15, 45], ['CM', 50, 48], ['RM', 85, 45], ['ST', 50, 15]]),
  '3-2-1': F('3-2-1', 'quick', [['GK', 50, 90], ['LB', 18, 70], ['CB', 50, 75], ['RB', 82, 70], ['CM', 34, 45], ['CM', 66, 45], ['ST', 50, 15]]),
  '2-1-2-1': F('2-1-2-1', 'quick', [['GK', 50, 90], ['CB', 32, 74], ['CB', 68, 74], ['CDM', 50, 54], ['LW', 20, 32], ['RW', 80, 32], ['ST', 50, 12]]),
};
export const formationsFor = (mode) => Object.keys(FORMATIONS).filter((k) => FORMATIONS[k].mode === mode);

/* Chemistry links join neighbouring slots on the pitch. */
function buildLinks(slots) {
  const d = (a, b) => Math.hypot(slots[a].x - slots[b].x, slots[a].y - slots[b].y);
  const set = new Set();
  const add = (a, b) => set.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  for (let i = 0; i < slots.length; i++) {
    const near = slots.map((_, j) => j).filter((j) => j !== i).sort((a, b) => d(i, a) - d(i, b));
    near.slice(0, 2).forEach((j) => add(i, j));             // everyone links to their two nearest teammates
    near.filter((j) => d(i, j) <= 27).forEach((j) => add(i, j)); // plus anyone close by
  }
  return [...set].map((k) => k.split('-').map(Number));
}
for (const f of Object.values(FORMATIONS)) f.links = buildLinks(f.slots);

/** Strength of one link between two footballers: club 3, nation 2, league 1. */
export function linkStrength(a, b) {
  if (!a || !b || a.academy || b.academy) return 0;
  if (a.club === b.club) return 3;
  if (a.nation === b.nation) return 2;
  if (a.league === b.league) return 1;
  return 0;
}

/**
 * Evaluate a lineup. `lineup` is an array of footballer ids (or null) in formation slot order.
 * Per-player chemistry (0–10) = position fit (4 natural / 2 related) + link points (capped at 6).
 */
export function evaluate(formationKey, lineup, lookup) {
  const form = FORMATIONS[formationKey];
  const players = form.slots.map((slot, i) => {
    const f = lineup[i] ? lookup(lineup[i]) : null;
    return { i, slot: slot.pos, f, eff: effective(f, slot.pos), fit: f ? fit(f.pos, slot.pos) : null, links: 0, chem: 0 };
  });
  // Only players in a natural or similar position build chemistry, and only with teammates who are too.
  // So moving a star out of position can never be "worth it" for chemistry.
  const inPos = (p) => p.f && (p.fit === 'natural' || p.fit === 'related');
  for (const [a, b] of form.links) {
    if (!inPos(players[a]) || !inPos(players[b])) continue;
    const s = linkStrength(players[a].f, players[b].f);
    players[a].links += s; players[b].links += s;
  }
  for (const p of players) p.chem = inPos(p) ? FIT_CHEM[p.fit] + Math.min(6, p.links) : 0;
  const n = form.slots.length;
  const avgEff = Math.round((players.reduce((t, p) => t + p.eff, 0) / n) * 10) / 10;
  const chemPct = Math.round((players.reduce((t, p) => t + p.chem, 0) / (n * 10)) * 100);
  const inPosAll = (i) => players[i].f && (players[i].fit === 'natural' || players[i].fit === 'related');
  return { players, avgEff, chemPct, final: finalScore(avgEff, chemPct), links: form.links.map(([a, b]) => ({ a, b, s: inPosAll(a) && inPosAll(b) ? linkStrength(players[a].f, players[b].f) : 0 })) };
}

/** Put a newly signed footballer into the best empty slot. Returns a new lineup array. */
export function autoPlace(formationKey, lineup, f) {
  const slots = FORMATIONS[formationKey].slots, next = lineup.slice();
  const order = ['natural', 'related', 'line', 'out'];
  for (const want of order) {
    const i = slots.findIndex((s, k) => !next[k] && fit(f.pos, s.pos) === want);
    if (i >= 0) { next[i] = f.id; return next; }
  }
  return next;
}

/** Re-seat a whole squad in a formation, greedily giving each slot its best available footballer. */
export function arrange(formationKey, ids, lookup) {
  const slots = FORMATIONS[formationKey].slots;
  const pool = ids.filter(Boolean).map(lookup).filter(Boolean);
  const out = Array(slots.length).fill(null);
  const pairs = [];
  const FIT_RANK = { natural: 3, related: 2, line: 1, out: 0 };
  slots.forEach((s, i) => pool.forEach((f) => pairs.push({ i, f, score: FIT_RANK[fit(f.pos, s.pos)] * 1000 + effective(f, s.pos) })));
  pairs.sort((a, b) => b.score - a.score);
  const usedF = new Set();
  for (const p of pairs) { if (out[p.i] || usedF.has(p.f.id)) continue; out[p.i] = p.f.id; usedF.add(p.f.id); }
  // then try swapping pairs while that improves the final score
  const look = (id) => pool.find((f) => f.id === id);
  let best = evaluate(formationKey, out, look).final, improved = true, guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    for (let a = 0; a < out.length; a++) for (let b = a + 1; b < out.length; b++) {
      if (!out[a] && !out[b]) continue;
      [out[a], out[b]] = [out[b], out[a]];
      const sc = evaluate(formationKey, out, look).final;
      if (sc > best + 0.001) { best = sc; improved = true; } else [out[a], out[b]] = [out[b], out[a]];
    }
  }
  return out;
}
