import React, { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { GAME_LEN, FIRST_WAVE, WAVE_EVERY, TOTAL_WAVES, START_MONEY, START_CPU, clamp, rand, newGame, makeEngine, buildResult, SCAM_KINDS } from './core.js';
import { makeWavePlan } from '../../shared/rules.js';
import { Icon, XPWindow, Hud, Taskbar, StartMenu, DesktopIcons } from './ui.jsx';
import { Tutorial } from '../screens.jsx';
import { MpDock } from '../online/MpDock.jsx';

export const snapKey = (gameId) => `asa.snap.${gameId}`;
const statsOf = (s) => {
  const r = buildResult(s);
  return { money: Math.round(s.money), cpu: Math.round(s.cpu), defeated: s.defeated, elapsed: Math.floor(s.elapsed), score: r.score, maxCpu: Math.round(s.maxCpu), moneyLost: Math.round(s.moneyLost), open: s.windows.filter((w) => !w.closing && SCAM_KINDS.has(w.kind)).length, fan: s.fanClicks, wave: s.wave };
};

function initState(online, clock) {
  if (online && online.restore) {
    const r = online.restore;
    r.windows = (r.windows || []).filter((w) => !w.closing);
    Object.assign(r, { toasts: [], floaters: [], feed: [], emotes: [], paused: false, showHelp: false, confirmQuit: false, startOpen: false, banner: null, phase: 'playing' });
    return r;
  }
  const s = newGame();
  if (!online) return s;
  s.wavePlan = makeWavePlan(online.seed);
  if (online.mode === 'coop') {
    s.moneyMax = START_MONEY * online.n;
    s.money = online.pool ? online.pool.money : s.moneyMax;
    s.cpu = online.pool ? online.pool.cpu : START_CPU;
  }
  const st = online.seedStats;
  if (st) {
    if (online.mode !== 'coop') { s.money = st.money; s.cpu = st.cpu; }
    s.defeated = st.defeated || 0; s.maxCpu = Math.max(s.cpu, st.maxCpu || 0); s.moneyLost = st.moneyLost || 0;
  }
  const t = clock();
  if (t > 0) { // joined late (reload without a saved desktop): skip the waves that already passed
    s.elapsed = Math.min(GAME_LEN, t);
    s.wave = Math.min(TOTAL_WAVES, Math.max(0, Math.floor((t - FIRST_WAVE) / WAVE_EVERY) + 1));
    s.nextWave = FIRST_WAVE + s.wave * WAVE_EVERY;
    s.queue = [];
  }
  return s;
}

export function Game({ player, onEnd, muted, onToggleMute, matchLabel, online }) {
  const [, force] = useReducer((x) => x + 1, 0);
  const hooks = useRef(null);
  if (!hooks.current) {
    hooks.current = online
      ? { mp: true, coop: online.mode === 'coop', n: online.n, clock: () => (online.net.now() - online.startAt) / 1000, onEndNow: (r) => online.onFinal(r) }
      : {};
  }
  const G = useRef(null); if (!G.current) G.current = initState(online, hooks.current.clock || (() => 0));
  const endRef = useRef(onEnd); endRef.current = onEnd;
  const ER = useRef(null); if (!ER.current) ER.current = makeEngine(G, force, endRef, hooks.current);
  const E = ER.current, s = G.current;
  const deskRef = useRef(null);
  const sync = useRef({ seq: Date.now(), unacked: [], lastMoney: s.money, lastCpu: s.cpu });
  const mpMode = online ? online.mode : null;

  useLayoutEffect(() => {
    const el = deskRef.current; if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      s.bounds = { w: Math.max(280, r.width), h: Math.max(220, r.height) };
      s.windows.forEach((w) => { w.w = Math.min(w.w, s.bounds.w - 8); w.h = Math.min(w.h, s.bounds.h - 8); w.x = clamp(w.x, -w.w + 90, s.bounds.w - 90); w.y = clamp(w.y, 0, s.bounds.h - 32); });
      force();
    };
    measure();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(el); } else window.addEventListener('resize', measure);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.VITE_DEBUG) window.__asa = { G, E, net: online && online.net };
    if (online && online.restore) { E.log('Reconnected. Your desktop was restored.', 'tip'); force(); return; }
    const t = E.openUtil('terminal', true);
    if (s.bounds.w < 640 && t) t.minimized = true;
    if (online) {
      E.log(online.mode === 'coop' ? `Co-op with ${online.n} players. You share one bank and one CPU. Keep the PC alive together!` : `Versus with ${online.n} players. Defeat scams to earn charges, then sabotage your rivals.`, 'wave');
      E.log('Everyone gets the same waves at the same time. Watch for global events!', 'tip');
    } else {
      E.log(`Welcome, ${player}. Survive 3:00. The first scam arrives in 3 seconds…`, 'wave');
      E.log('Drag windows by their title bars. Start menu, taskbar and desktop icons all work.', 'tip');
    }
    force();
  }, []);

  /* game loop + keyboard + visibility */
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const t = performance.now(), dt = Math.min(0.25, (t - last) / 1000); last = t;
      const st = G.current;
      if (st.phase === 'playing' && !st.paused) { E.tick(dt); force(); }
      else if (online) force(); // keep the countdown and dock moving
    }, 100);
    const vis = () => { if (!online && document.hidden && G.current.phase === 'playing') { G.current.paused = true; force(); } };
    const key = (e) => {
      const st = G.current; if (st.phase !== 'playing' || e.key !== 'Escape') return;
      if (st.showHelp) st.showHelp = false; else if (st.confirmQuit) { st.confirmQuit = false; if (!online) st.paused = false; } else if (st.startOpen) st.startOpen = false; else if (!online) st.paused = !st.paused;
      force();
    };
    document.addEventListener('visibilitychange', vis); window.addEventListener('keydown', key);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); window.removeEventListener('keydown', key); };
  }, []);

  /* online wiring */
  useEffect(() => {
    if (!online) return undefined;
    const net = online.net, coop = online.mode === 'coop', sy = sync.current;
    const offs = [
      net.on('sab', (m) => { E.applySabotage(m.kind, m.fromName); force(); }),
      net.on('assist', (m) => { E.applyAssist(m.kind, m.fromName); force(); }),
      net.on('global', (m) => { if (m.gameId === online.gameId) { E.applyGlobal(m.kind); force(); } }),
      net.on('blocked', (m) => { E.toast('Firewall', m.text, 'ShieldCheck', 'good'); force(); }),
      net.on('powered', (m) => { E.toast('Power-up', m.text, 'Zap', 'good'); force(); }),
      net.on('error', (m) => { if (m.code === 'power') { E.toast('Power-up', m.msg, 'Info', 'bad'); force(); } }),
      net.on('feed', (m) => { const st = G.current; st.feed.push({ id: st.uid++, text: m.text, tone: m.tone || 'info', until: st.elapsed + 5 }); if (st.feed.length > 4) st.feed.shift(); }),
      net.on('emote', (m) => { const st = G.current; st.emotes.push({ id: st.uid++, e: m.e, name: m.name, color: m.color, x: rand(8, 70), until: st.elapsed + 2.4 }); }),
      net.on('watchers', (m) => { G.current.watchers = m.n; }),
      net.on('pool', (m) => {
        if (!coop) return;
        const st = G.current, ack = (m.acks && m.acks[online.meId]) || 0;
        sy.unacked = sy.unacked.filter((u) => u.seq > ack);
        const pm = sy.unacked.reduce((a, u) => a + u.dm, 0), pc = sy.unacked.reduce((a, u) => a + u.dc, 0);
        const lm = st.money - sy.lastMoney, lc = st.cpu - sy.lastCpu;
        sy.lastMoney = m.money + pm; sy.lastCpu = m.cpu + pc;
        st.money = sy.lastMoney + lm; st.cpu = sy.lastCpu + lc;
      }),
      net.on('end', (m) => {
        const st = G.current, r = m.results;
        if (st.phase === 'playing' && r && r.gameId === online.gameId) { E.end(coop ? !!r.won : true, coop ? r.reason || 'survived' : 'survived'); }
      }),
    ];
    let k = 0;
    const iv = setInterval(() => {
      const st = G.current; k++;
      if (hooks.current.clock() < 0) return;
      if (coop && st.phase === 'playing') {
        const dm = st.money - sy.lastMoney, dc = st.cpu - sy.lastCpu;
        if (Math.abs(dm) > 0.001 || Math.abs(dc) > 0.001) {
          const seq = ++sy.seq;
          sy.unacked.push({ seq, dm, dc }); if (sy.unacked.length > 400) sy.unacked.shift();
          net.send({ t: 'coop', seq, dm, dc });
          sy.lastMoney = st.money; sy.lastCpu = st.cpu;
        }
      }
      if (k % 3 === 0 && st.phase === 'playing') net.send({ t: 'stats', s: statsOf(st) });
      if (k % 3 === 1 && st.watchers > 0) net.send({ t: 'snap', snap: E.snapshot() });
      if (k % 20 === 0 && st.phase === 'playing') {
        try { sessionStorage.setItem(snapKey(online.gameId), JSON.stringify({ ...st, log: st.log.slice(-40), toasts: [], floaters: [], feed: [], emotes: [] })); } catch (e) { /* storage full */ }
      }
    }, 100);
    return () => { offs.forEach((off) => off()); clearInterval(iv); };
  }, []);

  const resume = () => E.mut((st) => { st.paused = false; st.showHelp = false; st.confirmQuit = false; });
  const clockT = hooks.current.clock ? hooks.current.clock() : 1;
  const endInfo = s.endReason === 'survived' ? { t: mpMode === 'coop' ? 'TEAM SURVIVED' : 'YOU SURVIVED', sub: 'The scammers gave up. Your PC lives on.', icon: 'Trophy', cls: 'win' }
    : s.endReason === 'bankrupt' ? { t: 'BANKRUPT', sub: mpMode === 'coop' ? 'The team bank hit $0.' : 'Your bank balance hit $0.', icon: 'DollarSign', cls: 'lose' }
      : s.endReason === 'meltdown' ? { t: 'MELTDOWN', sub: mpMode === 'coop' ? 'The shared CPU hit 100°C.' : 'Your CPU hit 100°C and became a toaster.', icon: 'Flame', cls: 'lose' }
        : { t: online ? 'FORFEIT' : 'RUN ENDED', sub: 'You pulled the plug.', icon: 'Power', cls: 'lose' };
  const deskCls = ['desktop', s.shakeUntil > s.elapsed ? 'shake' : '', s.cpu >= 85 ? 'hot' : '', s.flipUntil > s.elapsed ? 'flipped' : ''].join(' ');

  return (
    <div className="game">
      <Hud s={s} E={E} muted={muted} onToggleMute={onToggleMute} player={player} matchLabel={matchLabel} mp={mpMode} netStatus={online ? online.net.status : 'open'} />
      <div className="desk-wrap">
        <div className={deskCls} ref={deskRef}
          onPointerDown={(e) => { if (s.startOpen && e.target === e.currentTarget) E.mut((st) => { st.startOpen = false; }); }}>
          <div className="bliss" aria-hidden="true" />
          {s.explorerDown <= 0 && <DesktopIcons E={E} mp={mpMode} />}
          {s.windows.map((w) => <XPWindow key={w.id} w={w} s={s} E={E} />)}
          <div className="floaters" aria-hidden="true">{s.floaters.map((f) => <div key={f.id} className="floater" style={{ left: f.x, top: f.y, color: f.color }}>{f.text}</div>)}</div>
        </div>
        {/* overlays live outside the flipped layer so they stay readable */}
        <div className="desk-overlays">
          <div className="toasts-wrap absolute right-2 bottom-2 z-[9100] flex flex-col gap-1.5 w-[min(290px,calc(100%-16px))]">
            {s.toasts.map((t) => (
              <div key={t.id} className={`toast ${t.tone}`}>
                <div className="toast-head"><Icon name={t.icon} size={15} /><b>{t.title}</b><button aria-label="Dismiss" onClick={() => E.mut((st) => { st.toasts = st.toasts.filter((x) => x.id !== t.id); })}><Icon name="X" size={12} /></button></div>
                <div>{t.body}</div>
              </div>
            ))}
          </div>
          {s.feed.length > 0 && <div className="killfeed">{s.feed.map((f) => <div key={f.id} className={`kf ${f.tone}`}>{f.text}</div>)}</div>}
          {s.emotes.map((em) => <div key={em.id} className="emote-float" style={{ left: `${em.x}%` }}><span>{em.e}</span><small style={{ background: em.color }}>{em.name}</small></div>)}
          {s.banner && s.banner.until > s.elapsed && (
            <div className={`banner ${s.banner.tone}`} key={s.banner.title + s.banner.until}><div className="banner-t">{s.banner.title}</div><div className="banner-s">{s.banner.sub}</div></div>
          )}
          {s.cpu >= 85 && <div className="heat-vignette" aria-hidden="true" />}
          {s.updateUntil > s.elapsed && (
            <div className="xp-update">
              <div className="xpu-box"><div className="xpu-logo"><span className="flag big"><i /><i /><i /><i /></span> Windows Update</div>
                <p>Installing update {Math.min(5, Math.floor(5 - (s.updateUntil - s.elapsed)) + 1)} of 5…</p>
                <div className="meter"><i style={{ width: `${clamp((1 - (s.updateUntil - s.elapsed) / 5) * 100, 0, 100)}%` }} /></div>
                <small>Do not turn off your computer. The scammers are still working, though.</small>
              </div>
            </div>
          )}
          {s.bsodUntil > s.elapsed && (
            <div className="bsod"><div><p className="bsod-t"> Windows </p><p>A fatal exception 0E has occurred at 0028:C0011E36 in VXD SCAM(01).</p><p>{s.cpu >= 78 ? 'Your CPU is too hot. Close some windows.' : 'Someone did this to you on purpose.'}</p><p>Press any key to continue _</p></div></div>
          )}
          {online && clockT < 0.8 && s.phase === 'playing' && (
            <div className="overlay countdown"><div className="cd-num" key={Math.ceil(-clockT)}>{clockT < 0 ? Math.ceil(-clockT) : 'GO!'}</div><p>{clockT < 0 ? (online.mode === 'coop' ? 'Co-op: one bank, one CPU, one team.' : 'Versus: same scams, same time. Outlast your friends.') : ''}</p></div>
          )}
          {!online && s.phase === 'playing' && s.paused && !s.showHelp && (
            <div className="overlay">
              {s.confirmQuit ? <QuitDialog onYes={() => E.mut(() => E.end(false, 'quit'))} onNo={resume} label="End run" text="End this run now? Your score so far will be recorded." /> : (
                <div className="pause-card">
                  <div className="pause-t">PAUSED</div>
                  <p>The scammers are waiting politely. For now.</p>
                  <div className="flex flex-col gap-2">
                    <button className="arc-btn" onClick={resume}><Icon name="Play" size={16} /> Resume</button>
                    <button className="arc-btn ghost" onClick={() => E.mut((st) => { st.showHelp = true; })}><Icon name="HelpCircle" size={16} /> How to play</button>
                    <button className="arc-btn ghost" onClick={() => E.mut((st) => { st.confirmQuit = true; })}><Icon name="Power" size={16} /> End run</button>
                  </div>
                  <small>Press Esc to pause or resume.</small>
                </div>
              )}
            </div>
          )}
          {online && s.phase === 'playing' && s.confirmQuit && (
            <div className="overlay"><QuitDialog onYes={() => E.mut(() => E.end(false, 'quit'))} onNo={() => E.mut((st) => { st.confirmQuit = false; })} label="Forfeit"
              text={online.mode === 'coop' ? 'Leave your team? They’ll have to keep the PC alive without you.' : 'Forfeit this round? You’ll be eliminated and can spectate the rest.'} /></div>
          )}
          {s.showHelp && s.phase === 'playing' && (
            <div className="overlay"><Tutorial inGame onDone={resume} doneLabel="Back to the chaos" /></div>
          )}
          {s.phase !== 'playing' && (
            <div className={`overlay end ${endInfo.cls}`}>
              <div className="end-card"><Icon name={endInfo.icon} size={54} /><div className="end-t">{endInfo.t}</div><p>{endInfo.sub}</p><small>{online ? 'Hold on…' : 'Tallying your score…'}</small></div>
            </div>
          )}
        </div>
        {online && <MpDock s={s} E={E} online={online} />}
      </div>
      <Taskbar s={s} E={E} muted={muted} onToggleMute={onToggleMute} />
      {s.startOpen && s.phase === 'playing' && <StartMenu s={s} E={E} player={player} muted={muted} onToggleMute={onToggleMute} mp={mpMode} />}
    </div>
  );
}

function QuitDialog({ onYes, onNo, label, text }) {
  return (
    <div className="xp-dialog">
      <div className="xptitle static"><Icon name="Power" size={14} /> {label}</div>
      <div className="xp-dialog-body">
        <p>{text}</p>
        <div className="dlg-btns"><button className="xp-b" onClick={onYes}>{label}</button><button className="xp-b" onClick={onNo}>Keep playing</button></div>
      </div>
    </div>
  );
}
