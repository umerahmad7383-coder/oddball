/* oddball platform — shared WebSocket client used by every multiplayer game.
 * Auto-reconnect with backoff, per-tab session id for resuming, a send queue for
 * messages written while offline, and server clock synchronisation. */
const SID_KEY = 'oddball.sid';
const VOLATILE = new Set(['stats', 'snap', 'emote', 'spectate']); // only the latest matters; never queued

function makeId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}
export function getSid() {
  // sessionStorage: survives a reload of this tab, but two tabs are two different players (handy for testing)
  try {
    let s = sessionStorage.getItem(SID_KEY);
    if (!s) { s = makeId(); sessionStorage.setItem(SID_KEY, s); }
    return s;
  } catch (e) { return makeId(); }
}
/** WebSocket address for one game. Each game gets its own endpoint: /ws/<gameId>.
 *  Set VITE_WS_BASE (e.g. wss://api.example.com) only if the server lives on another host. */
export function wsUrl(gameId) {
  const base = import.meta.env.VITE_WS_BASE;
  if (base) return `${base.replace(/\/$/, '')}/ws/${gameId}`;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws/${gameId}`;
}

export class Net {
  constructor(url) {
    this.url = url; this.sid = getSid(); this.ws = null; this.wanted = false; this.retry = 0;
    this.queue = []; this.handlers = new Map(); this.status = 'idle';
    this.offset = 0; this.samples = []; this.pingTimer = null; this.retryTimer = null;
  }
  connect() { this.wanted = true; this._open(); }
  close() {
    this.wanted = false; clearTimeout(this.retryTimer); clearInterval(this.pingTimer);
    if (this.ws) { try { this.ws.close(1000, 'bye'); } catch (e) { /* ignore */ } }
    this.ws = null; this._set('idle');
  }
  _set(s) { this.status = s; this._emit('status', { status: s }); }
  _open() {
    if (this.ws || !this.wanted) return;
    this._set(this.retry ? 'reconnecting' : 'connecting');
    let ws;
    try { ws = new WebSocket(this.url); } catch (e) { this._retry(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0; this._set('open');
      this._raw({ t: 'hello', sid: this.sid });
      this.samples = []; this._ping();
      clearInterval(this.pingTimer);
      let n = 0;
      this.pingTimer = setInterval(() => { n++; if (n < 6 || n % 5 === 0) this._ping(); }, 1000);
      const q = this.queue; this.queue = []; q.forEach((m) => this._raw(m));
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'pong') { this._pong(m); return; }
      this._emit(m.t, m);
    };
    ws.onclose = () => {
      clearInterval(this.pingTimer);
      if (this.ws === ws) this.ws = null;
      if (this.wanted) { this._set('reconnecting'); this._retry(); } else this._set('idle');
    };
    ws.onerror = () => { /* onclose follows */ };
  }
  _retry() {
    clearTimeout(this.retryTimer);
    const delay = Math.min(6000, 400 * 2 ** this.retry) + Math.random() * 300;
    this.retry++;
    this.retryTimer = setTimeout(() => this._open(), delay);
  }
  _raw(m) { try { this.ws.send(JSON.stringify(m)); } catch (e) { /* ignore */ } }
  _ping() { if (this.ws && this.ws.readyState === 1) this._raw({ t: 'ping', ct: Date.now() }); }
  _pong(m) {
    const t = Date.now(), rtt = t - m.ct;
    this.samples.push({ rtt, off: m.st - (m.ct + rtt / 2) });
    if (this.samples.length > 10) this.samples.shift();
    // trust the sample with the lowest round-trip time
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.offset = best.off; this.rtt = best.rtt;
  }
  /** Current time on the server's clock (ms). */
  now() { return Date.now() + this.offset; }
  send(m) {
    if (this.ws && this.ws.readyState === 1) this._raw(m);
    else if (!VOLATILE.has(m.t)) { this.queue.push(m); if (this.queue.length > 600) this.queue.shift(); }
  }
  on(t, fn) {
    if (!this.handlers.has(t)) this.handlers.set(t, new Set());
    this.handlers.get(t).add(fn);
    return () => this.handlers.get(t).delete(fn);
  }
  _emit(t, m) { const hs = this.handlers.get(t); if (hs) hs.forEach((fn) => { try { fn(m); } catch (e) { console.error(e); } }); }
}
