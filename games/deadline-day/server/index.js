/* Deadline Day — server-authoritative auction, mounted by the platform at /ws/deadline-day.
 * The server owns every price, timer, budget and squad; clients only send intents (bid, pass, lineup). */
import crypto from 'node:crypto';
import { createRoomHub } from '../../../platform/server/rooms.js';
import * as R from '../shared/rules.js';
import { FOOTBALLERS, BY_ID, makeAcademy } from '../shared/players.js';
import { FORMATIONS, formationsFor, autoPlace, evaluate, fit } from '../shared/tactics.js';

const now = () => Date.now();
/* DD_TIME_SCALE speeds the auction up for automated tests (e.g. 0.1). Leave unset in production. */
const SCALE = Math.min(1, Math.max(0.02, Number(process.env.DD_TIME_SCALE) || 1));
const ms = (x) => Math.round(x * SCALE);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const lookupFor = (g) => (id) => BY_ID[id] || g.academy[id] || null;
const present = (p) => p && !p.left && (p.connected || now() - p.disconnectedAt < 60_000);

function full(g, team) { return team.squad.length >= g.size; }
/** Can this manager place a bid of `amount` right now? */
function canBid(room, p, amount) {
  const g = room.game, team = g.teams[p.id];
  return !!team && p.connected && !p.left && !full(g, team) && R.maxBid(team, g.size) >= amount;
}

/* ---------- lot lifecycle ---------- */
function nextLot(room, api) {
  const g = room.game, t = now();
  const ps = api.players(room);
  const needing = ps.filter((p) => g.teams[p.id] && !full(g, g.teams[p.id]) && present(p));
  if (!needing.length) return startTactics(room, api);
  if (g.pi >= g.pool.length) {
    if (!g.bargain && g.unsold.length) {
      g.bargain = true; g.pool = shuffle(g.unsold); g.unsold = []; g.pi = 0;
      api.feed(room, 'Bargain bin! Unsold players come back at half price.', 'good');
    } else return startTactics(room, api);
  }
  // Pick lots managers actually need. If a manager is down to their last one or two slots
  // (say, only a goalkeeper left), lots for those positions are put up first most of the time.
  const openSlots = [], urgent = new Set();
  for (const p of needing) {
    const tm = g.teams[p.id];
    const open = FORMATIONS[tm.formation].slots.filter((sl, i) => !tm.lineup[i]).map((sl) => sl.pos);
    openSlots.push(...open);
    if (open.length && open.length <= 2) open.forEach((pos) => urgent.add(pos));
  }
  const fitsAny = (id, list) => { const f = BY_ID[id]; return list.some((pos) => { const k = fit(f.pos, pos); return k === 'natural' || k === 'related'; }); };
  const rest = g.pool.slice(g.pi);
  let j = -1;
  if (urgent.size && crypto.randomInt(100) < 75) j = rest.findIndex((id) => fitsAny(id, [...urgent]));
  if (j < 0) j = rest.findIndex((id) => fitsAny(id, openSlots));
  if (j > 0) { const k = g.pi + j; [g.pool[g.pi], g.pool[k]] = [g.pool[k], g.pool[g.pi]]; }
  const f = BY_ID[g.pool[g.pi++]];
  const price = g.bargain ? Math.max(R.MIN_PRICE, Math.round(R.startPrice(f.rating) / 2)) : R.startPrice(f.rating);
  g.lotN++;
  g.lot = { n: g.lotN, id: f.id, startPrice: price, price, leaderId: null, bids: [], passes: [], acted: [], status: 'reveal', openAt: t + ms(R.REVEAL_MS), endsAt: t + ms(R.REVEAL_MS) + ms(R.BID_MS), doneAt: 0, bargain: g.bargain };
  if (!ps.some((p) => canBid(room, p, price))) { g.lot.status = 'skipped'; g.lot.doneAt = t + ms(R.SKIP_MS); }
  api.pushRoom(room);
}
function isAway(g, p) { const tm = g.teams[p.id]; return !!tm && tm.idle >= R.AWAY_AFTER_LOTS; }
/** If every other manager who could still bid has passed (or is away), start the "going, going…" countdown. */
function checkClose(room, api) {
  const g = room.game, lot = g.lot; if (!lot || lot.status !== 'open') return;
  const need = R.nextBid(lot);
  const waiting = api.players(room).filter((p) => p.id !== lot.leaderId && canBid(room, p, need) && (liveAuto(room, p, lot) >= need || (!isAway(g, p) && !lot.passes.includes(p.id))));
  if (!waiting.length) { lot.status = 'closing'; lot.endsAt = Math.min(lot.endsAt, now() + ms(R.CLOSING_MS)); }
}
function settle(room, api) {
  const g = room.game, lot = g.lot, t = now();
  if (lot.autoTimer) { clearTimeout(lot.autoTimer); lot.autoTimer = null; }
  for (const tm of Object.values(g.teams)) if (tm.auto && tm.auto.lot === lot.n) tm.auto = null;
  const winner = lot.leaderId && room.players.get(lot.leaderId);
  const team = winner && g.teams[winner.id];
  if (team && !full(g, team) && team.budget >= lot.price) {
    team.budget -= lot.price; team.spent += lot.price;
    team.squad.push({ id: lot.id, price: lot.price, lot: lot.n });
    team.lineup = autoPlace(team.formation, team.lineup, BY_ID[lot.id]);
    lot.status = 'sold'; lot.doneAt = t + ms(R.SOLD_MS);
    g.history.unshift({ n: lot.n, id: lot.id, pid: winner.id, price: lot.price });
    api.broadcast(room, { t: 'ev', ev: { type: 'sold', n: lot.n, pid: winner.id, price: lot.price, id: lot.id } });
  } else {
    lot.status = 'unsold'; lot.leaderId = null; lot.doneAt = t + ms(R.UNSOLD_MS);
    if (!g.bargain) g.unsold.push(lot.id);
    api.broadcast(room, { t: 'ev', ev: { type: 'unsold', n: lot.n, id: lot.id } });
  }
  // managers who ignored this lot drift towards "away" (auto-pass) so nobody can stall the auction
  for (const p of api.players(room)) {
    const tm = g.teams[p.id]; if (!tm || full(g, tm) || !canBid(room, p, lot.startPrice)) continue;
    tm.idle = lot.acted.includes(p.id) ? 0 : tm.idle + 1;
  }
  api.pushRoom(room);
}

/* ---------- tactics & results ---------- */
function startTactics(room, api) {
  const g = room.game;
  let n = Object.keys(g.academy).length;
  for (const [pid, tm] of Object.entries(g.teams)) {
    while (tm.squad.length < g.size) {
      const slots = FORMATIONS[tm.formation].slots;
      const emptyIdx = tm.lineup.findIndex((x) => !x);
      const a = makeAcademy(emptyIdx >= 0 ? slots[emptyIdx].pos : 'CM', n++);
      g.academy[a.id] = a;
      tm.squad.push({ id: a.id, price: 0, academy: true });
      if (emptyIdx >= 0) tm.lineup[emptyIdx] = a.id;
      const p = room.players.get(pid);
      if (p && tm.squad.length === g.size) api.feed(room, `${p.name}’s squad was topped up with academy players`);
    }
    tm.ready = false;
  }
  g.lot = null; g.phase = 'tactics';
  g.tacticsEndsAt = now() + ms(R.MODES[g.mode].tacticsSec * 1000);
  api.broadcast(room, { t: 'ev', ev: { type: 'tactics' } });
  api.pushRoom(room);
}
function finish(room, api) {
  const g = room.game; if (g.phase === 'results') return;
  const look = lookupFor(g);
  g.results = Object.entries(g.teams).map(([pid, tm]) => {
    const p = room.players.get(pid);
    const ev = evaluate(tm.formation, tm.lineup, look);
    return { pid, name: p ? p.name : 'Manager', color: p ? p.color : '#888', left: p ? p.left : true, final: ev.final, avg: ev.avgEff, chem: ev.chemPct, spent: tm.spent, remaining: tm.budget, formation: tm.formation, lineup: tm.lineup };
  }).sort((a, b) => b.final - a.final || b.remaining - a.remaining);
  g.results.forEach((r, i) => { r.rank = i + 1; });
  g.phase = 'results';
  stop(room);
  api.broadcast(room, { t: 'ev', ev: { type: 'results' } });
  api.pushRoom(room);
}

function tick(room, api) {
  const g = room.game; if (!g) return;
  const t = now();
  if (g.phase === 'auction') {
    const lot = g.lot;
    if (!lot) { if (t >= g.nextAt) nextLot(room, api); return; }
    if (lot.status === 'reveal' && t >= lot.openAt) { lot.status = 'open'; scheduleAuto(room, api); checkClose(room, api); api.pushRoom(room); return; }
    if ((lot.status === 'open' || lot.status === 'closing') && t >= lot.endsAt) { settle(room, api); return; }
    if (['sold', 'unsold', 'skipped'].includes(lot.status) && t >= lot.doneAt) { g.lot = null; nextLot(room, api); }
  } else if (g.phase === 'tactics') {
    const ready = api.players(room).filter((p) => g.teams[p.id] && present(p));
    if (t >= g.tacticsEndsAt || (ready.length && ready.every((p) => g.teams[p.id].ready))) finish(room, api);
  }
}
function stop(room) { if (room.timer) { clearInterval(room.timer); room.timer = null; } }

/* ---------- bidding ---------- */
function placeBid(room, api, p, amount, auto) {
  const g = room.game, lot = g.lot, team = g.teams[p.id], t = now();
  lot.price = amount; lot.leaderId = p.id;
  lot.bids.unshift({ pid: p.id, amount, at: t, auto: !!auto }); if (lot.bids.length > 12) lot.bids.pop();
  lot.passes = lot.passes.filter((x) => x !== p.id);
  if (!lot.acted.includes(p.id)) lot.acted.push(p.id);
  if (!auto) team.idle = 0;
  if (lot.status === 'closing') { lot.status = 'open'; lot.endsAt = Math.max(lot.endsAt, t + ms(R.EXTEND_TO_MS)); }
  else if (lot.endsAt - t < ms(R.EXTEND_WINDOW_MS)) lot.endsAt = t + ms(R.EXTEND_TO_MS);
  api.broadcast(room, { t: 'ev', ev: { type: 'bid', n: lot.n, pid: p.id, amount, auto: !!auto } });
  scheduleAuto(room, api);
  checkClose(room, api);
  api.pushRoom(room);
}
/* Auto-bids (proxy bidding): the strongest limit wins at just above the runner-up's limit. */
function liveAuto(room, p, lot) {
  const g = room.game, tm = g.teams[p.id];
  if (!tm || !tm.auto || tm.auto.lot !== lot.n || full(g, tm) || !p.connected || p.left) return 0;
  return Math.min(tm.auto.max, R.maxBid(tm, g.size));
}
function scheduleAuto(room, api) {
  const lot = room.game && room.game.lot;
  if (!lot || lot.autoTimer) return;
  lot.autoTimer = setTimeout(() => { lot.autoTimer = null; runAuto(room, api, lot); }, ms(750));
}
function runAuto(room, api, lot) {
  const g = room.game;
  if (!g || g.lot !== lot || (lot.status !== 'open' && lot.status !== 'closing')) return;
  const need = R.nextBid(lot);
  const challengers = api.players(room).filter((p) => p.id !== lot.leaderId).map((p) => ({ p, max: liveAuto(room, p, lot) }))
    .filter((c) => c.max >= need).sort((a, b) => b.max - a.max || g.teams[a.p.id].auto.at - g.teams[b.p.id].auto.at);
  if (!challengers.length) return;
  const best = challengers[0], runnerUp = challengers[1] ? challengers[1].max : 0;
  const leader = lot.leaderId && room.players.get(lot.leaderId);
  const leaderMax = leader ? liveAuto(room, leader, lot) : 0;
  if (leader && leaderMax >= best.max) {
    // the leader's own auto-bid defends: they move to just above the challenger's limit
    const amount = Math.min(leaderMax, best.max + R.increment(best.max));
    if (amount > lot.price) { placeBid(room, api, leader, Math.max(amount, need), true); }
    g.teams[best.p.id].auto = null;
    api.send(best.p, { t: 'toast', text: `Your auto-bid limit of ${R.fmtM(best.max)} was beaten.` });
    return;
  }
  const floor = Math.max(need, Math.max(leaderMax, runnerUp) + (Math.max(leaderMax, runnerUp) ? R.increment(Math.max(leaderMax, runnerUp)) : 0));
  placeBid(room, api, best.p, Math.min(best.max, floor), true);
  if (leader && leaderMax) { g.teams[leader.id].auto = null; api.send(leader, { t: 'toast', text: `Your auto-bid limit of ${R.fmtM(leaderMax)} was beaten.` }); }
}

/* ---------- messages ---------- */
function onMessage(room, p, m, api) {
  const g = room.game; if (!g) return null;
  const team = g.teams[p.id];
  switch (m.t) {
    case 'bid': {
      const lot = g.lot;
      if (!lot || lot.n !== m.lot) return 'That lot has already closed.';
      if (lot.status !== 'open' && lot.status !== 'closing') return 'Bidding hasn’t opened yet.';
      if (!team) return 'You’re watching this auction, not bidding in it.';
      if (full(g, team)) return 'Your squad is already complete.';
      if (lot.leaderId === p.id) return 'You’re already the highest bidder.';
      const min = R.nextBid(lot), amount = Math.round(Number(m.amount));
      if (!Number.isFinite(amount) || amount < min) return `Someone beat you to it. The next bid is ${R.fmtM(min)}.`;
      const max = R.maxBid(team, g.size);
      if (amount > max) return `You can go up to ${R.fmtM(max)} and still afford the rest of your squad.`;
      placeBid(room, api, p, amount, false);
      return null;
    }
    case 'autobid': {
      const lot = g.lot;
      if (!team || !lot || lot.n !== m.lot) return null;
      const max = Math.round(Number(m.max) || 0);
      if (max <= 0) { team.auto = null; api.pushRoom(room); return null; }
      const cap = R.maxBid(team, g.size);
      if (max < R.nextBid(lot) && lot.leaderId !== p.id) return `Your auto-bid limit needs to be at least ${R.fmtM(R.nextBid(lot))}.`;
      team.auto = { lot: lot.n, max: Math.min(max, cap), at: now() };
      team.idle = 0;
      if (!lot.acted.includes(p.id)) lot.acted.push(p.id);
      lot.passes = lot.passes.filter((x) => x !== p.id);
      scheduleAuto(room, api);
      api.pushRoom(room);
      return null;
    }
    case 'pass': {
      const lot = g.lot;
      if (!lot || lot.n !== m.lot || !team) return null;
      if (lot.leaderId === p.id) return 'You’re winning this one. Wait for the hammer!';
      if (!lot.passes.includes(p.id)) lot.passes.push(p.id);
      if (team.auto) team.auto = null;
      if (!lot.acted.includes(p.id)) lot.acted.push(p.id);
      team.idle = 0;
      if (lot.status === 'open') checkClose(room, api);
      api.pushRoom(room);
      return null;
    }
    case 'back': { if (team) { team.idle = 0; if (g.lot) checkClose(room, api); api.pushRoom(room); } return null; }
    case 'lineup': {
      if (!team || g.phase === 'results') return null;
      const form = FORMATIONS[m.formation];
      if (!form || form.mode !== g.mode || !Array.isArray(m.lineup) || m.lineup.length !== g.size) return 'That formation doesn’t fit this mode.';
      const owned = new Set(team.squad.map((s) => s.id)), seen = new Set();
      for (const id of m.lineup) {
        if (id == null) continue;
        if (!owned.has(id) || seen.has(id)) return 'That lineup includes someone who isn’t in your squad.';
        seen.add(id);
      }
      if (seen.size !== owned.size) return 'Every signing needs a place on the pitch.';
      team.formation = m.formation; team.lineup = m.lineup.map((x) => x || null);
      api.pushRoom(room);
      return null;
    }
    case 'lock': {
      if (!team || g.phase !== 'tactics') return null;
      team.ready = !!m.ready;
      api.pushRoom(room);
      return null;
    }
    default: return null;
  }
}

/* ---------- module ---------- */
export function createDeadlineDayServer() {
  return createRoomHub({
    id: R.GAME_ID, minPlayers: R.MIN_PLAYERS, maxPlayers: R.MAX_PLAYERS, colors: R.COLORS,
    defaultSettings: () => ({ mode: 'classic' }),
    validateSettings: (s) => ({ mode: R.MODES[s.mode] ? s.mode : 'classic' }),
    allowJoin: (room) => (room.phase === 'lobby' ? null : 'This auction has already started. Ask the host to start a rematch, then join.'),
    onStart(room, api) {
      const mode = room.settings.mode, size = R.MODES[mode].size, formation = formationsFor(mode)[0];
      const teams = {};
      for (const p of api.players(room)) {
        if (!p.connected || p.left) continue;
        teams[p.id] = { budget: R.BUDGET, spent: 0, squad: [], formation, lineup: Array(size).fill(null), ready: false, idle: 0, auto: null };
      }
      room.game = {
        mode, size, phase: 'auction', pool: shuffle(FOOTBALLERS.map((f) => f.id)), pi: 0, unsold: [], bargain: false,
        lot: null, lotN: 0, nextAt: now() + ms(3500), teams, history: [], academy: {}, tacticsEndsAt: 0, results: null, startedAt: now(),
      };
      stop(room);
      room.timer = setInterval(() => { try { tick(room, api); } catch (e) { console.error('[deadline-day] tick', e); } }, 100);
    },
    onMessage,
    onDisconnect(room, p, api) { if (room.game && room.game.lot) checkClose(room, api); },
    onLeave(room, p, api) { if (room.game && room.game.lot) checkClose(room, api); },
    onReconnect() {},
    onLobby: stop,
    onDestroy: stop,
    view(room, viewer) {
      const g = room.game; if (!g) return null;
      const lot = g.lot && { ...g.lot, acted: undefined, autoTimer: undefined };
      return {
        mode: g.mode, size: g.size, phase: g.phase, lot, lotN: g.lotN, poolLeft: g.pool.length - g.pi, bargain: g.bargain, nextAt: g.nextAt,
        teams: Object.fromEntries(Object.entries(g.teams).map(([id, tm]) => [id, { ...tm, auto: tm.auto ? (viewer && viewer.id === id ? tm.auto : { lot: tm.auto.lot, hidden: true }) : null }])), history: g.history.slice(0, 30), academy: g.academy, tacticsEndsAt: g.tacticsEndsAt, results: g.results,
      };
    },
  });
}
