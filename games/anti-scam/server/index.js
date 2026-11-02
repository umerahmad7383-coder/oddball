/* Anti-Scam Arcade — multiplayer game module.
 * Mounted by the oddball platform server at /ws/anti-scam.
 * The server is authoritative for rooms, the synchronized start time, co-op team resources,
 * power-up charges, global events, elimination and final rankings. Each player's desktop
 * simulation runs in their own browser and reports stats here.
 */
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import {
  GAME_LEN, MAX_PLAYERS, MIN_PLAYERS, COUNTDOWN_MS, CODE_ALPHABET, COLORS, EMOTES, SABOTAGES, ASSISTS, GLOBAL_EVENTS,
  MAX_CHARGES, ENERGY_PER_CHARGE, START_MONEY, START_CPU, scheduleGlobals, computeScore, cleanName,
} from '../shared/rules.js';

const LOBBY_DROP_MS = 30_000;      // lobby players who stay disconnected this long are removed
const HOST_GRACE_MS = 8_000;       // host keeps the crown through a quick reload
const EMPTY_ROOM_MS = 10 * 60_000; // rooms with nobody connected are deleted after this
const DEAD_AFTER_MS = 15_000;      // a disconnected player stops counting as "alive" in versus

/* ---------------- state ---------------- */
const rooms = new Map();    // code -> room
const sidIndex = new Map(); // session id -> { code, pid }

const rid = (n = 8) => crypto.randomBytes(n).toString('base64url').slice(0, n);
const now = () => Date.now();
const num = (v, lo, hi, d = 0) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
function newCode() {
  for (let i = 0; i < 1000; i++) {
    let c = ''; const bytes = crypto.randomBytes(6);
    for (let j = 0; j < 6; j++) c += CODE_ALPHABET[bytes[j] % CODE_ALPHABET.length];
    if (!rooms.has(c)) return c;
  }
  throw new Error('no codes left');
}
function uniqueName(room, name, selfId) {
  const taken = new Set([...room.players.values()].filter((p) => p.id !== selfId).map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let i = 2; i < 10; i++) { const n = `${name.slice(0, 13)} ${i}`; if (!taken.has(n.toLowerCase())) return n; }
  return `${name.slice(0, 10)} ${rid(3)}`;
}
const raw = (ws, data) => { if (ws && ws.readyState === 1) ws.send(data); };
const send = (ws, msg) => raw(ws, JSON.stringify(msg));
function bcast(room, msg, filter) {
  const data = JSON.stringify(msg);
  for (const p of room.players.values()) if (p.connected && (!filter || filter(p))) raw(p.ws, data);
}
const gameTime = (room) => (room.game ? (now() - room.game.startAt) / 1000 : 0);

function publicPlayer(room, p) {
  return {
    id: p.id, name: p.name, color: p.color, ready: p.ready, connected: p.connected, status: p.status, isHost: room.hostId === p.id,
    charges: p.charges, energy: p.energy, firewall: p.firewallUntil > now(), rematch: p.rematch, stats: p.stats, sent: p.sent, received: p.received,
  };
}
function publicRoom(room) {
  const g = room.game;
  return {
    code: room.code, hostId: room.hostId, mode: room.mode, phase: room.phase,
    players: [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => publicPlayer(room, p)),
    game: g ? { id: g.id, seed: g.seed, mode: g.mode, startAt: g.startAt, n: g.n, pool: g.pool, fired: g.events.filter((e) => e.fired).map((e) => e.kind) } : null,
    results: room.results,
  };
}
const pushRoom = (room) => bcast(room, { t: 'room', room: publicRoom(room) });
function feed(room, text, tone = 'info') { bcast(room, { t: 'feed', text, tone }); }

/* ---------------- rooms & players ---------------- */
function createRoom() {
  const room = { code: newCode(), hostId: null, mode: 'versus', phase: 'lobby', players: new Map(), game: null, results: null, loop: null, emptySince: 0 };
  rooms.set(room.code, room);
  return room;
}
function addPlayer(room, sid, name, ws) {
  const used = new Set([...room.players.values()].map((p) => p.color));
  const p = {
    id: rid(8), sid, name: uniqueName(room, name), color: COLORS.find((c) => !used.has(c)) || COLORS[0], ready: false, connected: true, ws,
    status: room.phase === 'playing' ? 'spectator' : 'lobby', stats: null, energy: 0, charges: 0, lastDefeated: 0, firewallUntil: 0, spectating: null,
    rematch: false, sent: 0, received: 0, final: null, ack: 0, joinedAt: now(), emoteAt: 0, snapAt: 0, disconnectedAt: 0,
  };
  room.players.set(p.id, p);
  sidIndex.set(sid, { code: room.code, pid: p.id });
  if (!room.hostId) room.hostId = p.id;
  return p;
}
function pickHost(room) {
  const cands = [...room.players.values()].filter((p) => p.connected && p.status !== 'left').sort((a, b) => a.joinedAt - b.joinedAt);
  const next = cands[0] || [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
  room.hostId = next ? next.id : null;
  if (next) feed(room, `${next.name} is now the host 👑`);
}
function removePlayer(room, p) {
  room.players.delete(p.id);
  sidIndex.delete(p.sid);
  recountWatchers(room);
  if (room.players.size === 0) { destroyRoom(room); return; }
  if (room.hostId === p.id) pickHost(room);
  pushRoom(room);
}
function destroyRoom(room) {
  if (room.loop) clearInterval(room.loop);
  for (const p of room.players.values()) sidIndex.delete(p.sid);
  rooms.delete(room.code);
}
function leave(room, p) {
  if (room.phase === 'playing' && ['playing', 'eliminated', 'survived'].includes(p.status)) {
    // keep their row for the final rankings
    if (p.status === 'playing') feed(room, `${p.name} left the game 🚪`, 'bad');
    p.status = 'left'; p.connected = false; p.ws = null; sidIndex.delete(p.sid);
    if (room.hostId === p.id) pickHost(room);
    recountWatchers(room);
    pushRoom(room);
    if ([...room.players.values()].every((x) => !x.connected)) destroyRoom(room);
  } else removePlayer(room, p);
}

/* ---------------- game lifecycle ---------------- */
function canStart(room) {
  const active = [...room.players.values()].filter((p) => p.connected && p.status !== 'left');
  if (active.length < MIN_PLAYERS) return `Waiting for at least ${MIN_PLAYERS} players`;
  const notReady = active.filter((p) => p.id !== room.hostId && !p.ready);
  if (notReady.length) return `Waiting for ${notReady.map((p) => p.name).join(', ')} to ready up`;
  return null;
}
function startGame(room) {
  const parts = [...room.players.values()].filter((p) => p.connected && p.status !== 'left');
  const seed = crypto.randomBytes(4).readUInt32BE(0) >>> 1;
  const n = parts.length;
  room.game = {
    id: rid(10), seed, mode: room.mode, startAt: now() + COUNTDOWN_MS, n, events: scheduleGlobals(seed).map((e) => ({ ...e, fired: false })),
    pool: room.mode === 'coop' ? { money: START_MONEY * n, cpu: START_CPU } : null, ended: false, statsDirty: true, lastStats: 0, lastPool: 0,
  };
  for (const p of room.players.values()) {
    const playing = parts.includes(p);
    Object.assign(p, { status: playing ? 'playing' : 'spectator', stats: null, final: null, energy: 0, charges: playing ? 1 : 0, lastDefeated: 0, firewallUntil: 0, spectating: null, sent: 0, received: 0, rematch: false, ack: 0, ready: false });
  }
  room.phase = 'playing'; room.results = null;
  pushRoom(room);
  feed(room, room.mode === 'coop' ? 'Co-op round starting. Keep the shared PC alive!' : 'Versus round starting. Last desktop standing wins!');
  if (room.loop) clearInterval(room.loop);
  room.loop = setInterval(() => tickRoom(room), 100);
}
function aliveVersus(room) {
  const t = now();
  return [...room.players.values()].filter((p) => p.status === 'playing' && (p.connected || t - p.disconnectedAt < DEAD_AFTER_MS));
}
function tickRoom(room) {
  const g = room.game; if (!g || g.ended) return;
  const t = gameTime(room); if (t < 0) return;
  for (const ev of g.events) {
    if (!ev.fired && t >= ev.at) {
      ev.fired = true;
      if (g.pool) {
        if (ev.kind === 'heatwave') g.pool.cpu = Math.min(130, g.pool.cpu + 10);
        if (ev.kind === 'breeze') g.pool.cpu = Math.max(32, g.pool.cpu - 15);
        if (ev.kind === 'glitch') g.pool.money += 300 * g.n;
      }
      bcast(room, { t: 'global', kind: ev.kind, gameId: g.id });
    }
  }
  if (g.pool) {
    bcast(room, { t: 'pool', money: Math.round(g.pool.money * 100) / 100, cpu: Math.round(g.pool.cpu * 100) / 100, acks: Object.fromEntries([...room.players.values()].map((p) => [p.id, p.ack])) });
    if (g.pool.money <= 0) { g.pool.money = 0; endGame(room, false, 'bankrupt'); return; }
    if (g.pool.cpu >= 100) { g.pool.cpu = 100; endGame(room, false, 'meltdown'); return; }
    if (t >= GAME_LEN + 0.3) { endGame(room, true, 'survived'); return; }
    if ([...room.players.values()].every((p) => p.status !== 'playing' || (!p.connected && now() - p.disconnectedAt > DEAD_AFTER_MS))) { endGame(room, false, 'abandoned'); return; }
  } else {
    if (aliveVersus(room).length === 0 && t > 1) { endGame(room); return; }
    if (t >= GAME_LEN + 2.5) { endGame(room); return; }
  }
  if (g.statsDirty && now() - g.lastStats > 250) {
    g.statsDirty = false; g.lastStats = now();
    bcast(room, { t: 'stats', players: [...room.players.values()].map((p) => publicPlayer(room, p)) });
  }
}
function rowFor(p, g) {
  const r = p.final || {}, st = p.stats || {};
  const pick = (k, d) => (r[k] != null ? r[k] : st[k] != null ? st[k] : d);
  let status = p.status;
  if (status === 'playing') status = g.mode === 'versus' ? (p.connected ? 'survived' : 'disconnected') : 'team';
  return {
    id: p.id, name: p.name, color: p.color, status, reason: r.reason || null,
    score: Math.round(pick('score', 0)), survival: Math.round(pick('survival', pick('elapsed', 0))), money: Math.round(pick('money', 0)),
    defeated: pick('defeated', 0), maxCpu: Math.round(pick('maxCpu', START_CPU)), moneyLost: Math.round(pick('moneyLost', 0)), fan: pick('fan', 0),
    sent: p.sent, received: p.received,
  };
}
function endGame(room, won = null, reason = null) {
  const g = room.game; if (!g || g.ended) return;
  g.ended = true; clearInterval(room.loop); room.loop = null;
  const t = Math.max(0, Math.min(GAME_LEN, gameTime(room)));
  const parts = [...room.players.values()].filter((p) => ['playing', 'eliminated', 'survived', 'left'].includes(p.status));
  const rows = parts.map((p) => rowFor(p, g));
  let results;
  if (g.mode === 'coop') {
    const defeated = rows.reduce((a, r) => a + r.defeated, 0);
    const survival = won ? GAME_LEN : t;
    const money = Math.max(0, Math.round(g.pool.money));
    const sc = computeScore(survival, money / g.n, defeated, !!won);
    rows.sort((a, b) => b.defeated - a.defeated || a.moneyLost - b.moneyLost);
    results = { gameId: g.id, mode: 'coop', won: !!won, reason, survival: Math.round(survival), money, defeated, n: g.n, ...sc, players: rows };
  } else {
    rows.sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => { r.rank = i + 1; });
    results = { gameId: g.id, mode: 'versus', survival: Math.round(t), players: rows };
  }
  room.results = results; room.phase = 'results';
  for (const p of room.players.values()) { p.rematch = false; p.spectating = null; }
  bcast(room, { t: 'end', results });
  pushRoom(room);
}
function backToLobby(room) {
  for (const p of [...room.players.values()]) {
    if (p.status === 'left' || !p.connected) { room.players.delete(p.id); sidIndex.delete(p.sid); continue; }
    p.ready = p.rematch; p.status = 'lobby'; p.stats = null; p.final = null; p.charges = 0; p.energy = 0; p.rematch = false;
  }
  room.phase = 'lobby'; room.game = null; room.results = null;
  if (!room.players.has(room.hostId)) pickHost(room);
  if (room.players.size === 0) { destroyRoom(room); return; }
  pushRoom(room);
}
function recountWatchers(room) {
  const counts = {};
  for (const p of room.players.values()) if (p.spectating) counts[p.spectating] = (counts[p.spectating] || 0) + 1;
  for (const p of room.players.values()) {
    const n = counts[p.id] || 0;
    if (p.watchers !== n) { p.watchers = n; send(p.ws, { t: 'watchers', n }); }
  }
}

/* ---------------- power-ups ---------------- */
function grantEnergy(p, gained) {
  p.energy += gained;
  while (p.energy >= ENERGY_PER_CHARGE) {
    if (p.charges >= MAX_CHARGES) { p.energy = ENERGY_PER_CHARGE; break; }
    p.charges++; p.energy -= ENERGY_PER_CHARGE;
  }
}
function usePower(room, p, kind, targetId) {
  const g = room.game;
  if (room.phase !== 'playing' || !g || gameTime(room) < 0 || p.status !== 'playing') return 'You can only use power-ups while you’re playing.';
  const coop = g.mode === 'coop';
  const def = (coop ? ASSISTS : SABOTAGES)[kind];
  if (!def) return 'Unknown power-up.';
  if (p.charges < def.cost) return `${def.name} needs ${def.cost} charge${def.cost > 1 ? 's' : ''}.`;
  if (def.self) {
    p.charges -= def.cost;
    if (kind === 'firewall') { p.firewallUntil = now() + 25_000; send(p.ws, { t: 'powered', text: 'Firewall up for 25 seconds 🛡️' }); feed(room, `${p.name} raised a firewall 🛡️`); }
    if (kind === 'nitrogen') { g.pool.cpu = Math.max(32, g.pool.cpu - 12); feed(room, `${p.name} poured liquid nitrogen on the CPU ❄️ (−12°C)`, 'good'); }
    if (kind === 'funds') { g.pool.money += 600; feed(room, `${p.name} found emergency funds 💵 (+$600)`, 'good'); }
    g.statsDirty = true;
    return null;
  }
  const others = [...room.players.values()].filter((x) => x.id !== p.id && x.status === 'playing' && x.connected);
  if (!others.length) return coop ? 'No teammates to help right now.' : 'No opponents left to sabotage.';
  let target;
  if (targetId === 'random') target = others[Math.floor(Math.random() * others.length)];
  else if (targetId === 'leader') target = others.slice().sort((a, b) => (b.stats?.score || 0) - (a.stats?.score || 0))[0];
  else target = others.find((x) => x.id === targetId);
  if (!target) return 'That player isn’t in the game anymore.';
  p.charges -= def.cost; g.statsDirty = true;
  if (coop) {
    send(target.ws, { t: 'assist', kind, fromName: p.name });
    feed(room, `${p.name} swept a scam off ${target.name}’s screen 🧹`, 'good');
    return null;
  }
  if (target.firewallUntil > now()) {
    target.firewallUntil = 0;
    send(p.ws, { t: 'powered', text: `${target.name}’s firewall blocked your ${def.name}!` });
    send(target.ws, { t: 'blocked', text: `Your firewall blocked ${p.name}’s ${def.name}! 🛡️` });
    feed(room, `${target.name}’s firewall blocked ${p.name}’s ${def.name} 🛡️`);
    return null;
  }
  p.sent++; target.received++;
  send(target.ws, { t: 'sab', kind, fromName: p.name });
  send(p.ws, { t: 'powered', text: `${def.name} sent to ${target.name}! 😈` });
  feed(room, `${p.name} ➜ ${target.name}: ${def.name}`, 'bad');
  return null;
}

/* ---------------- message handling ---------------- */
function ctx(ws) {
  const s = ws.sid && sidIndex.get(ws.sid);
  if (!s) return {};
  const room = rooms.get(s.code); const p = room && room.players.get(s.pid);
  return room && p ? { room, p } : {};
}
function attach(ws, room, p) {
  if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'replaced'); } catch { /* ignore */ } }
  p.ws = ws; p.connected = true; p.disconnectedAt = 0;
  send(ws, { t: 'joined', pid: p.id, code: room.code });
  send(ws, { t: 'room', room: publicRoom(room) });
  if (room.phase === 'results') send(ws, { t: 'end', results: room.results });
  send(ws, { t: 'watchers', n: p.watchers || 0 });
}

function handle(ws, m) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'ping') { send(ws, { t: 'pong', ct: m.ct, st: now() }); return; }
  if (m.t === 'hello') {
    const sid = typeof m.sid === 'string' && /^[\w-]{8,64}$/.test(m.sid) ? m.sid : null;
    if (!sid) { send(ws, { t: 'error', code: 'bad_session', msg: 'Invalid session.' }); return; }
    ws.sid = sid;
    const { room, p } = ctx(ws);
    if (room && p) {
      const wasDown = !p.connected;
      attach(ws, room, p);
      if (wasDown) { feed(room, `${p.name} reconnected 🔌`); pushRoom(room); }
    } else send(ws, { t: 'noroom' });
    return;
  }
  if (!ws.sid) return;
  const { room, p } = ctx(ws);

  switch (m.t) {
    case 'create': {
      if (room && p) leave(room, p);
      const r = createRoom();
      const np = addPlayer(r, ws.sid, cleanName(m.name, 'Host'), ws);
      attach(ws, r, np);
      return;
    }
    case 'join': {
      const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const r = rooms.get(code);
      if (!r) { send(ws, { t: 'error', code: 'not_found', msg: `There’s no room with code ${code || '(empty)'}. Check the code and try again.` }); return; }
      if (room && p) { if (room === r) { attach(ws, r, p); return; } leave(room, p); }
      const active = [...r.players.values()].filter((x) => x.status !== 'left');
      if (active.length >= MAX_PLAYERS) { send(ws, { t: 'error', code: 'full', msg: `Room ${code} is full (${MAX_PLAYERS} players max).` }); return; }
      const np = addPlayer(r, ws.sid, cleanName(m.name, 'Player'), ws);
      attach(ws, r, np);
      feed(r, r.phase === 'playing' ? `${np.name} joined as a spectator 👀` : `${np.name} joined the lobby 👋`);
      pushRoom(r);
      return;
    }
    default: break;
  }
  if (!room || !p) { send(ws, { t: 'noroom' }); return; }

  switch (m.t) {
    case 'leave': leave(room, p); send(ws, { t: 'left' }); return;
    case 'rename': if (room.phase === 'lobby') { p.name = uniqueName(room, cleanName(m.name, p.name), p.id); pushRoom(room); } return;
    case 'ready': if (room.phase === 'lobby') { p.ready = !!m.ready; pushRoom(room); } return;
    case 'mode': if (room.phase === 'lobby' && room.hostId === p.id && (m.mode === 'versus' || m.mode === 'coop')) { room.mode = m.mode; pushRoom(room); } return;
    case 'start': {
      if (room.phase !== 'lobby' || room.hostId !== p.id) return;
      const why = canStart(room);
      if (why) { send(ws, { t: 'error', code: 'cant_start', msg: why }); return; }
      startGame(room); return;
    }
    case 'stats': {
      if (room.phase !== 'playing' || !['playing', 'eliminated', 'survived'].includes(p.status) || !m.s) return;
      const s = m.s;
      p.stats = {
        money: Math.round(num(s.money, -1e6, 1e7)), cpu: Math.round(num(s.cpu, 0, 150)), defeated: Math.round(num(s.defeated, 0, 999)), elapsed: Math.round(num(s.elapsed, 0, GAME_LEN)),
        score: Math.round(num(s.score, 0, 1e6)), maxCpu: Math.round(num(s.maxCpu, 0, 150)), moneyLost: Math.round(num(s.moneyLost, 0, 1e7)), open: Math.round(num(s.open, 0, 99)), fan: Math.round(num(s.fan, 0, 1e5)), wave: Math.round(num(s.wave, 0, 99)),
      };
      if (p.stats.defeated > p.lastDefeated) { grantEnergy(p, p.stats.defeated - p.lastDefeated); p.lastDefeated = p.stats.defeated; }
      room.game.statsDirty = true;
      return;
    }
    case 'coop': {
      const g = room.game;
      if (room.phase !== 'playing' || !g || !g.pool || g.ended || p.status !== 'playing') return;
      const seq = num(m.seq, 0, Number.MAX_SAFE_INTEGER);
      if (seq <= p.ack) return; // duplicate after a reconnect
      p.ack = seq;
      g.pool.money += num(m.dm, -5000, 5000);
      g.pool.cpu = Math.min(130, Math.max(32, g.pool.cpu + num(m.dc, -60, 60)));
      return;
    }
    case 'final': {
      if (room.phase !== 'playing' || p.status !== 'playing' || !m.result) return;
      const r = m.result;
      p.final = {
        won: !!r.won, reason: ['survived', 'bankrupt', 'meltdown', 'quit'].includes(r.reason) ? r.reason : 'quit', score: Math.round(num(r.score, 0, 1e6)),
        survival: Math.round(num(r.survival, 0, GAME_LEN)), money: Math.round(num(r.money, 0, 1e7)), defeated: Math.round(num(r.defeated, 0, 999)),
        maxCpu: Math.round(num(r.maxCpu, 0, 150)), moneyLost: Math.round(num(r.moneyLost, 0, 1e7)), fan: Math.round(num(r.fan, 0, 1e5)),
      };
      if (room.game.mode === 'coop') {
        if (!p.final.won) { p.status = 'eliminated'; feed(room, `${p.name} unplugged and left the team 🔌`, 'bad'); }
      } else if (p.final.won) {
        p.status = 'survived'; feed(room, `${p.name} survived the full 3 minutes! 🏆`, 'good');
      } else {
        p.status = 'eliminated';
        const how = p.final.reason === 'bankrupt' ? 'went bankrupt 💸' : p.final.reason === 'meltdown' ? 'melted down 🔥' : 'pulled the plug 🔌';
        feed(room, `${p.name} ${how}`, 'bad');
      }
      room.game.statsDirty = true;
      pushRoom(room);
      return;
    }
    case 'power': {
      const err = usePower(room, p, String(m.kind), String(m.target || 'leader'));
      if (err) send(ws, { t: 'error', code: 'power', msg: err });
      pushRoom(room);
      return;
    }
    case 'spectate': {
      const target = m.target ? room.players.get(String(m.target)) : null;
      p.spectating = target && target.id !== p.id ? target.id : null;
      recountWatchers(room);
      return;
    }
    case 'snap': {
      if (room.phase !== 'playing' || !m.snap || now() - p.snapAt < 200) return;
      p.snapAt = now();
      bcast(room, { t: 'snap', from: p.id, snap: m.snap }, (x) => x.spectating === p.id);
      return;
    }
    case 'emote': {
      if (!EMOTES.includes(m.e) || now() - p.emoteAt < 700) return;
      p.emoteAt = now();
      bcast(room, { t: 'emote', from: p.id, name: p.name, color: p.color, e: m.e });
      return;
    }
    case 'rematch': {
      if (room.phase !== 'results') return;
      p.rematch = true;
      if (room.hostId === p.id) backToLobby(room); else pushRoom(room);
      return;
    }
    default: break;
  }
}

/* ---------------- sockets ---------------- */
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    try { handle(ws, m); } catch (e) { console.error('handler error', e); }
  });
  ws.on('close', () => {
    const { room, p } = ctx(ws);
    if (!room || !p || p.ws !== ws) return;
    p.connected = false; p.ws = null; p.disconnectedAt = now();
    if (p.spectating) { p.spectating = null; recountWatchers(room); }
    if (room.phase === 'playing' && p.status === 'playing') feed(room, `${p.name} lost connection… 📡`, 'bad');
    pushRoom(room);
  });
});
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch { /* ignore */ } }
}, 15_000);

/* housekeeping: drop stale lobby players, migrate hosts, delete empty rooms */
setInterval(() => {
  const t = now();
  for (const room of [...rooms.values()]) {
    let changed = false;
    if (room.phase !== 'playing') {
      for (const p of [...room.players.values()]) {
        if (!p.connected && p.disconnectedAt && t - p.disconnectedAt > LOBBY_DROP_MS) { room.players.delete(p.id); sidIndex.delete(p.sid); changed = true; }
      }
      if (room.players.size === 0) { destroyRoom(room); continue; }
    }
    const host = room.players.get(room.hostId);
    if (!host || (!host.connected && t - host.disconnectedAt > HOST_GRACE_MS && [...room.players.values()].some((p) => p.connected))) { pickHost(room); changed = true; }
    const anyone = [...room.players.values()].some((p) => p.connected);
    if (anyone) room.emptySince = 0; else if (!room.emptySince) room.emptySince = t; else if (t - room.emptySince > EMPTY_ROOM_MS) { destroyRoom(room); continue; }
    if (changed) pushRoom(room);
  }
}, 2_000);

/* what the platform server needs from this game */
export const antiScamServer = {
  id: 'anti-scam',
  wss,
  stats: () => ({ rooms: rooms.size, players: [...rooms.values()].reduce((t, r) => t + r.players.size, 0) }),
};
