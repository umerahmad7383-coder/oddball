/* oddball platform — reusable multiplayer rooms.
 *
 * A game plugs in by passing a definition object; the hub handles everything that is the same
 * for every party game: 6-character room codes, names, colours, host + host migration, ready-up,
 * lobby settings, per-tab sessions that survive reloads, disconnect/reconnect, rematches,
 * clock sync and housekeeping. Each game keeps its own rules and state in `room.game`.
 *
 * Game definition:
 *   id, minPlayers, maxPlayers, colors[]
 *   defaultSettings()                      -> settings object shown in the lobby
 *   validateSettings(next, prev)           -> sanitised settings (host only)
 *   allowJoin(room)                        -> null, or a message explaining why not
 *   onStart(room, api)                     -> set room.game, start timers
 *   onMessage(room, player, msg, api)      -> handle game messages; return an error string to send back
 *   onLeave / onDisconnect / onReconnect(room, player, api)
 *   view(room, player)                     -> the game part of the state sent to a player
 *   onLobby(room) / onDestroy(room)        -> stop timers, clear game state
 */
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const LOBBY_DROP_MS = 30_000;
const HOST_GRACE_MS = 8_000;
const EMPTY_ROOM_MS = 10 * 60_000;

export function cleanName(n, fallback = 'Player') {
  const s = String(n || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return s || fallback;
}
const rid = (n = 8) => crypto.randomBytes(n).toString('base64url').slice(0, n);
const raw = (ws, data) => { if (ws && ws.readyState === 1) ws.send(data); };

export function createRoomHub(game) {
  const rooms = new Map();
  const sidIndex = new Map(); // sid -> { code, pid }
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });

  const send = (p, msg) => { if (p && p.connected) raw(p.ws, JSON.stringify(msg)); };
  const broadcast = (room, msg, filter) => { const d = JSON.stringify(msg); for (const p of room.players.values()) if (p.connected && (!filter || filter(p))) raw(p.ws, d); };
  const players = (room) => [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  function publicRoom(room, viewer) {
    return {
      game: game.id, code: room.code, hostId: room.hostId, phase: room.phase, settings: room.settings,
      players: players(room).map((p) => ({ id: p.id, name: p.name, color: p.color, ready: p.ready, connected: p.connected, left: p.left, isHost: room.hostId === p.id, rematch: p.rematch })),
      state: room.phase === 'lobby' ? null : game.view(room, viewer),
    };
  }
  function pushRoom(room) { for (const p of room.players.values()) if (p.connected) raw(p.ws, JSON.stringify({ t: 'room', room: publicRoom(room, p) })); }
  function feed(room, text, tone = 'info') { broadcast(room, { t: 'feed', text, tone }); }

  function newCode() {
    for (let i = 0; i < 1000; i++) {
      const b = crypto.randomBytes(6); let c = '';
      for (let j = 0; j < 6; j++) c += ALPHABET[b[j] % ALPHABET.length];
      if (!rooms.has(c)) return c;
    }
    throw new Error('Out of room codes');
  }
  function uniqueName(room, name, selfId) {
    const taken = new Set([...room.players.values()].filter((p) => p.id !== selfId).map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; i < 20; i++) { const n = `${name.slice(0, 13)} ${i}`; if (!taken.has(n.toLowerCase())) return n; }
    return `${name.slice(0, 10)} ${rid(3)}`;
  }
  function addPlayer(room, sid, name, ws) {
    const used = new Set([...room.players.values()].map((p) => p.color));
    const p = { id: rid(8), sid, name: uniqueName(room, name), color: game.colors.find((c) => !used.has(c)) || game.colors[0], ready: false, connected: true, left: false, ws, joinedAt: Date.now(), disconnectedAt: 0, rematch: false };
    room.players.set(p.id, p);
    sidIndex.set(sid, { code: room.code, pid: p.id });
    if (!room.hostId) room.hostId = p.id;
    return p;
  }
  function pickHost(room) {
    const next = players(room).find((p) => p.connected && !p.left) || players(room)[0];
    room.hostId = next ? next.id : null;
    if (next) feed(room, `${next.name} is now the host`);
  }
  function destroy(room) {
    if (game.onDestroy) game.onDestroy(room);
    for (const p of room.players.values()) sidIndex.delete(p.sid);
    rooms.delete(room.code);
  }
  function removePlayer(room, p) {
    room.players.delete(p.id); sidIndex.delete(p.sid);
    if (room.players.size === 0) { destroy(room); return; }
    if (room.hostId === p.id) pickHost(room);
    pushRoom(room);
  }
  function backToLobby(room) {
    if (game.onLobby) game.onLobby(room);
    for (const p of players(room)) {
      if (p.left || !p.connected) { room.players.delete(p.id); sidIndex.delete(p.sid); continue; }
      p.ready = p.rematch; p.rematch = false;
    }
    room.phase = 'lobby'; room.game = null;
    if (room.players.size === 0) { destroy(room); return; }
    if (!room.players.has(room.hostId)) pickHost(room);
    pushRoom(room);
  }
  const api = { send, broadcast, pushRoom, feed, players, backToLobby, now: () => Date.now() };

  function attach(ws, room, p) {
    if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'replaced'); } catch { /* ignore */ } }
    const wasDown = !p.connected;
    p.ws = ws; p.connected = true; p.disconnectedAt = 0;
    raw(ws, JSON.stringify({ t: 'joined', pid: p.id, code: room.code }));
    if (wasDown && room.phase !== 'lobby' && game.onReconnect) game.onReconnect(room, p, api);
    pushRoom(room);
  }
  function ctx(ws) {
    const s = ws.sid && sidIndex.get(ws.sid); if (!s) return {};
    const room = rooms.get(s.code), p = room && room.players.get(s.pid);
    return room && p ? { room, p } : {};
  }
  function leave(room, p) {
    if (room.phase === 'lobby') { removePlayer(room, p); return; }
    p.left = true; p.connected = false; p.ws = null; sidIndex.delete(p.sid);
    if (game.onLeave) game.onLeave(room, p, api);
    feed(room, `${p.name} left the room`, 'bad');
    if (room.hostId === p.id) pickHost(room);
    if ([...room.players.values()].every((x) => !x.connected)) { destroy(room); return; }
    pushRoom(room);
  }

  function handle(ws, m) {
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'ping') { raw(ws, JSON.stringify({ t: 'pong', ct: m.ct, st: Date.now() })); return; }
    if (m.t === 'hello') {
      const sid = typeof m.sid === 'string' && /^[\w-]{8,64}$/.test(m.sid) ? m.sid : null;
      if (!sid) return;
      ws.sid = sid;
      const { room, p } = ctx(ws);
      if (room && p) attach(ws, room, p); else raw(ws, JSON.stringify({ t: 'noroom' }));
      return;
    }
    if (!ws.sid) return;
    const err = (msg, code = 'error') => raw(ws, JSON.stringify({ t: 'error', code, msg }));
    let { room, p } = ctx(ws);

    if (m.t === 'create') {
      if (room && p) leave(room, p);
      const r = { code: newCode(), hostId: null, phase: 'lobby', settings: game.defaultSettings(), players: new Map(), game: null, emptySince: 0 };
      rooms.set(r.code, r);
      attach(ws, r, addPlayer(r, ws.sid, cleanName(m.name, 'Host'), ws));
      return;
    }
    if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const r = rooms.get(code);
      if (!r) { err(`There’s no room with code ${code || '(empty)'}. Check the code and try again.`, 'not_found'); return; }
      if (room === r && p) { attach(ws, r, p); return; }
      const why = game.allowJoin ? game.allowJoin(r) : null;
      if (why) { err(why, 'closed'); return; }
      if ([...r.players.values()].filter((x) => !x.left).length >= game.maxPlayers) { err(`Room ${code} is full (${game.maxPlayers} players max).`, 'full'); return; }
      if (room && p) leave(room, p);
      const np = addPlayer(r, ws.sid, cleanName(m.name, 'Player'), ws);
      feed(r, `${np.name} joined`);
      attach(ws, r, np);
      return;
    }
    if (!room || !p) { raw(ws, JSON.stringify({ t: 'noroom' })); return; }

    switch (m.t) {
      case 'leave': leave(room, p); raw(ws, JSON.stringify({ t: 'left' })); return;
      case 'ready': if (room.phase === 'lobby') { p.ready = !!m.ready; pushRoom(room); } return;
      case 'settings':
        if (room.phase === 'lobby' && room.hostId === p.id && m.settings) { room.settings = game.validateSettings(m.settings, room.settings); pushRoom(room); }
        return;
      case 'start': {
        if (room.phase !== 'lobby' || room.hostId !== p.id) return;
        const active = players(room).filter((x) => x.connected && !x.left);
        if (active.length < game.minPlayers) { err(`You need at least ${game.minPlayers} players to start.`); return; }
        const notReady = active.filter((x) => x.id !== room.hostId && !x.ready);
        if (notReady.length) { err(`Waiting for ${notReady.map((x) => x.name).join(', ')} to ready up.`); return; }
        room.phase = 'game';
        for (const x of room.players.values()) { x.ready = false; x.rematch = false; }
        game.onStart(room, api);
        pushRoom(room);
        return;
      }
      case 'rematch':
        if (room.phase !== 'game') return;
        p.rematch = true;
        if (room.hostId === p.id) backToLobby(room); else pushRoom(room);
        return;
      default: {
        if (room.phase !== 'game') return;
        const e = game.onMessage(room, p, m, api);
        if (e) err(e, m.t);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => {
      let m; try { m = JSON.parse(data.toString()); } catch { return; }
      try { handle(ws, m); } catch (e) { console.error(`[${game.id}] handler error`, e); }
    });
    ws.on('close', () => {
      const { room, p } = ctx(ws);
      if (!room || !p || p.ws !== ws) return;
      p.connected = false; p.ws = null; p.disconnectedAt = Date.now();
      if (room.phase !== 'lobby' && game.onDisconnect) game.onDisconnect(room, p, api);
      pushRoom(room);
    });
  });
  setInterval(() => {
    for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch { /* ignore */ } }
  }, 15_000);
  setInterval(() => {
    const t = Date.now();
    for (const room of [...rooms.values()]) {
      let changed = false;
      if (room.phase === 'lobby') {
        for (const p of players(room)) if (!p.connected && p.disconnectedAt && t - p.disconnectedAt > LOBBY_DROP_MS) { room.players.delete(p.id); sidIndex.delete(p.sid); changed = true; }
        if (room.players.size === 0) { destroy(room); continue; }
      }
      const host = room.players.get(room.hostId);
      if (!host || (!host.connected && t - host.disconnectedAt > HOST_GRACE_MS && players(room).some((p) => p.connected))) { pickHost(room); changed = true; }
      if (players(room).some((p) => p.connected)) room.emptySince = 0;
      else if (!room.emptySince) room.emptySince = t;
      else if (t - room.emptySince > EMPTY_ROOM_MS) { destroy(room); continue; }
      if (changed) pushRoom(room);
    }
  }, 2_000);

  return {
    id: game.id, wss,
    stats: () => ({ rooms: rooms.size, players: [...rooms.values()].reduce((n, r) => n + r.players.size, 0) }),
  };
}
