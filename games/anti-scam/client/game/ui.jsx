/* Anti-Scam Arcade — icons, window bodies, window frame, HUD, taskbar and Start menu. */
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Thermometer, Wallet, Timer, Zap, ShieldCheck, ShieldAlert, Download, Phone, Bitcoin, Volume2, VolumeX, Pause, Play, X, Minus, Trophy, Users, HelpCircle, Gamepad2, RotateCcw, Home, Fan, Terminal, Monitor, Trash2, AlertTriangle, Flame, DollarSign, Gift, Paperclip, Lock, Unlock, Power, ChevronRight, ChevronLeft, Crown, Medal, Sparkles, FileText, Paintbrush, Calculator, Spade, Music, Bomb, Wifi, Info, Swords, Printer, HardDrive, Battery, MessageCircle, RefreshCw, Rocket, PhoneOff, CreditCard, Flag, Settings, Square, Bug, Globe, Snowflake, Copy, Link, Share2, LogOut, Eye, Radio, WifiOff, Check, UserPlus, Skull, Target, ChevronDown, ChevronUp, Smile, Loader2, Plug, PanelRightClose, PanelRightOpen, Star, Hourglass } from 'lucide-react';
import { GAME_LEN, TOTAL_WAVES, START_MONEY, clamp, fmtMoney, fmtTime, fmtClock, fmtNum, fmtPrice, SCAM_KINDS, SCAN_PATHS, EULA, APP_BY_ID, APP_CONFIRM, newMines, dealCards, Sound, titleIcon, procName } from './core.js';

const ICONS = { Activity, Thermometer, Wallet, Timer, Zap, ShieldCheck, ShieldAlert, Download, Phone, Bitcoin, Volume2, VolumeX, Pause, Play, X, Minus, Trophy, Users, HelpCircle, Gamepad2, RotateCcw, Home, Fan, Terminal, Monitor, Trash2, AlertTriangle, Flame, DollarSign, Gift, Paperclip, Lock, Unlock, Power, ChevronRight, ChevronLeft, Crown, Medal, Sparkles, FileText, Paintbrush, Calculator, Spade, Music, Bomb, Wifi, Info, Swords, Printer, HardDrive, Battery, MessageCircle, RefreshCw, Rocket, PhoneOff, CreditCard, Flag, Settings, Square, Bug, Globe, Snowflake, Copy, Link, Share2, LogOut, Eye, Radio, WifiOff, Check, UserPlus, Skull, Target, ChevronDown, ChevronUp, Smile, Loader2, Plug, PanelRightClose, PanelRightOpen, Star, Hourglass };
export function Icon({ name, size = 16, className = '', strokeWidth = 2, style }) {
  const C = ICONS[name];
  if (!C) return null;
  return <C size={size} className={className} strokeWidth={strokeWidth} style={style} aria-hidden="true" />;
}

/* ---------- pixel icons ---------- */
const PAL = { k: '#121212', w: '#ffffff', g: '#c6c6c6', G: '#6b6b6b', b: '#2f6fe0', B: '#0a2e8a', c: '#5fd3ff', y: '#ffd23f', r: '#e8322b', n: '#2fbf4a', d: '#06301a' };
const PIX = {
  computer: ['............', '.kkkkkkkkkk.', '.kggggggggk.', '.kgbbbbbbgk.', '.kgbccbbbgk.', '.kgbcbbbbgk.', '.kgbbbbbbgk.', '.kggggggggk.', '.kkkkkkkkkk.', '....kggk....', '..kkggggkk..', '..kkkkkkkk..'],
  recycle: ['....kkkk....', '.kkkggggkkk.', '.kwwwwwwwwk.', '..kwnwnwnk..', '..kwnwnwnk..', '..kwnwnwnk..', '..kwnwnwnk..', '..kwnwnwnk..', '..kwnwnwnk..', '..kwwwwwwk..', '...kkkkkk...', '............'],
  taskmgr: ['kkkkkkkkkkkk', 'kBBBBBBBwBrk', 'kkkkkkkkkkkk', 'kddddddddndk', 'kdddddddnddk', 'kndddddndddk', 'kdndddnddddk', 'kddndndddddk', 'kdddnddddddk', 'kddddddddddk', 'kGGGGGGGGGGk', 'kkkkkkkkkkkk'],
  fan: ['............', '..ccc.......', '.ccccc..c...', '.cccccc.cc..', '..ccccckcc..', '....ckkkc...', '...ckkkc....', '..cckccccc..', '..cc.cccccc.', '...c..ccccc.', '.......ccc..', '............'],
  terminal: ['kkkkkkkkkkkk', 'kGGGGGGGGGGk', 'kddddddddddk', 'kdnddddddddk', 'kddndddddddk', 'kdddnddddddk', 'kddndddddddk', 'kdndddnnnddk', 'kddddddddddk', 'kddddddddddk', 'kkkkkkkkkkkk', '............'],
  help: ['............', '...yyyyyy...', '..yyykkyyy..', '.yyykyykyyy.', '.yyyyyykyyy.', '.yyyyykyyyy.', '.yyyykyyyyy.', '.yyyykyyyyy.', '..yyyyyyyy..', '...yykyyy...', '....yy......', '............'],
};
export function Pixel({ name, size = 36 }) {
  const rects = [];
  PIX[name].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rects.push(<rect key={x + '-' + y} x={x} y={y} width="1.02" height="1.02" fill={PAL[ch]} />); }));
  return <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" className="pixicon" aria-hidden="true">{rects}</svg>;
}


/* ================= Window bodies ================= */
const canHover = () => { try { return window.matchMedia('(hover: hover)').matches; } catch (e) { return true; } };

function DownloadBody({ w, E }) {
  const d = w.data, ptr = useRef('mouse');
  const hov = d.hover != null ? d.buttons[d.hover] : null;
  return (
    <div className="dl">
      <div className="dl-banner"><Icon name="Sparkles" size={16} /> <span>Your file <b>{d.file}</b> is ready! Click DOWNLOAD below.</span></div>
      <div className="dl-ads"><span>🎰 Hot singles in your CPU</span><span>💾 Download more RAM</span><span>🏆 You won a cruise</span></div>
      <div className="dl-grid">
        {d.buttons.map((b, i) => b.gone ? (
          <div key={i} className="dl-crater">💥 infected</div>
        ) : (
          <button key={i} className={`dl-btn ${d.armed === i ? 'armed' : ''}`}
            onPointerEnter={(e) => { if (e.pointerType !== 'touch') E.mut(() => { d.hover = i; }); }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') E.mut(() => { if (d.hover === i) d.hover = null; }); }}
            onFocus={() => E.mut(() => { d.hover = i; })}
            onPointerDown={(e) => { ptr.current = e.pointerType; }}
            onClick={() => { const p = ptr.current; ptr.current = 'mouse'; E.mut(() => E.downloadClick(w, i, p)); }}>
            <Icon name="Download" size={18} /> DOWNLOAD
          </button>
        ))}
      </div>
      <div className="dl-timer">
        <span>Auto-install starts in {Math.ceil(d.timer)}s</span>
        <div className="meter red"><i style={{ width: `${clamp(d.timer / d.max * 100, 0, 100)}%` }} /></div>
      </div>
      <div className="statusbar">
        {hov ? (<><Icon name={hov.url.startsWith('https') ? 'Lock' : 'Unlock'} size={12} /> <span className="mono">{hov.url}</span></>)
          : (<span>{canHover() ? 'Done' : 'Tap a button once to preview its link, twice to download.'}</span>)}
      </div>
    </div>
  );
}

function TechBody({ w, E }) {
  const d = w.data, ref = useRef(null);
  const rate = Math.min(32, d.base + d.age * 0.5);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [d.msgs.length]);
  return (
    <div className="tech">
      <div className="tech-head">
        <div className="tech-avatar"><Icon name="Phone" size={22} /></div>
        <div><b>Windoes Support Helpline</b><div>☎ 1-800-NOT-A-SCAM — Agent: Kevin</div></div>
      </div>
      <div className="tech-bill"><Icon name="CreditCard" size={14} /> Remote session billing: <b>${rate.toFixed(0)}/sec</b></div>
      <div className="tech-chat" ref={ref}>
        {d.msgs.map((m, i) => <div key={i} className="msg"><b>Kevin:</b> {m}</div>)}
        <div className="typing"><span /><span /><span /></div>
      </div>
      <div className="tech-actions flex flex-wrap gap-1.5 px-2.5 py-1.5 border-t border-[#c8d4f0]">
        <button className="xp-b" onClick={() => E.mut(() => E.techHangup(w))}><Icon name="PhoneOff" size={14} /> Hang up</button>
        <button className="xp-b" onClick={() => E.mut(() => E.techGift(w))}><Icon name="Gift" size={14} /> Buy gift cards ($500)</button>
      </div>
      <div className="tech-foot">Remote process: {d.proc}</div>
    </div>
  );
}

function CryptoBody({ w, E, s }) {
  const d = w.data, pts = d.prices;
  const max = Math.max(...pts), min = Math.min(...pts), W = 300, H = 110;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * W, H - 5 - ((p - min) / (max - min || 1)) * (H - 10)]);
  const line = xy.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
  const change = (d.price / d.open - 1) * 100, val = d.holdings * d.price, pl = d.returned + val - d.invested;
  const color = d.crashed ? '#ff3b5c' : change >= 0 ? '#21e07a' : '#ff8a3d';
  return (
    <div className="crypto">
      <div className="cx-top">
        <div className="cx-coin"><Icon name="Rocket" size={16} /> {d.coin}</div>
        <div className="cx-price">${fmtPrice(d.price)}</div>
        <div className={change >= 0 ? 'cx-up' : 'cx-down'}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</div>
      </div>
      <div className="cx-chartwrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="cx-chart">
          <polygon points={`0,${H} ${line} ${W},${H}`} fill={color} opacity="0.18" />
          <polyline points={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        {d.crashed && (
          <div className="cx-rug">
            <b>RUG PULLED</b>
            <span>{d.lostCoins > 0 ? `Your ${fmtNum(d.lostCoins)} ${d.coin} are worth $0.00` : 'You weren’t holding. Nicely dodged.'}</span>
            <span>Exchange closes in {Math.max(0, Math.ceil(6 - d.post))}s (or press X)</span>
          </div>
        )}
      </div>
      <div className="cx-news">{d.news.slice(0, 2).map((n, i) => <div key={n + i} className={i === 0 ? 'fresh' : ''}>{n}</div>)}</div>
      <div className="cx-wallet grid grid-cols-4 gap-1">
        <div><small>Bank</small><b>{fmtMoney(s.money)}</b></div>
        <div><small>Holding</small><b>{fmtNum(d.holdings)} {d.coin}</b></div>
        <div><small>Value</small><b>{fmtMoney(val)}</b></div>
        <div><small>Profit</small><b className={pl >= 0 ? 'pos' : 'neg'}>{pl >= 0 ? '+' : '−'}{fmtMoney(Math.abs(pl))}</b></div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button className="cx-btn buy" disabled={d.crashed} onClick={() => E.mut(() => E.cryptoBuy(w, 250))}>Buy $250</button>
        <button className="cx-btn buy" disabled={d.crashed} onClick={() => E.mut(() => E.cryptoBuy(w, 1000))}>Buy $1,000</button>
        <button className="cx-btn sell" disabled={d.crashed || d.holdings <= 0} onClick={() => E.mut(() => E.cryptoSell(w))}>Sell all</button>
      </div>
      <div className="cx-fine">*Not guaranteed. Mining {d.coin} in the background (CPU +).</div>
    </div>
  );
}

function AntivirusBody({ w, E }) {
  const d = w.data;
  const threats = d.threats + Math.floor(d.scan * 23);
  const rows = d.files.map((f) => ({ f }));
  if (d.variant === 'file') rows.splice(d.exitIdx, 0, { exit: true });
  return (
    <div className="av">
      <div className="av-head">
        <Icon name="ShieldAlert" size={34} />
        <div><b>{threats.toLocaleString()} THREATS DETECTED</b><div>Your PC is EXTREMELY infected!!!</div></div>
      </div>
      <div className="av-scan"><Icon name="RefreshCw" size={12} className="spin" /> Scanning {SCAN_PATHS[Math.floor(d.scan * 3) % SCAN_PATHS.length]}</div>
      <div className="av-list">
        {rows.map((r, i) => r.exit ? (
          <button key={'exit'} className="av-row safe" onClick={() => E.mut(() => E.avExit(w))}><span>ExitDefender.exe</span><span>Safe — click to run</span></button>
        ) : (
          <button key={i} className="av-row" onClick={() => E.mut(() => E.avFake(w, 'quarantine'))}><span>{r.f[0]}</span><span className="bad">{r.f[1]}</span></button>
        ))}
      </div>
      <button className="av-big" onClick={() => E.mut(() => E.avFake(w, 'remove'))}>REMOVE ALL THREATS — {fmtMoney(d.charge)}</button>
      <div className="flex gap-1.5">
        <button className="xp-b flex-1" onClick={() => E.mut(() => E.avFake(w, 'activate'))}>Activate protection</button>
        <button className="xp-b flex-1" onClick={() => E.mut(() => E.avFake(w, 'cancel'))}>Cancel</button>
      </div>
      {d.variant === 'eula' && (
        <div className="av-eula">
          <div className="av-eula-title">License agreement (scroll to read)</div>
          <div className="av-eula-box">
            {EULA.map((p) => <p key={p}>{p}</p>)}
            <button className="eula-decline" onClick={() => E.mut(() => E.avExit(w))}>I decline. Close Defender.</button>
          </div>
        </div>
      )}
      <div className="av-renew">
        <span>Auto-renewal in {Math.max(0, Math.ceil(d.timer))}s ({fmtMoney(d.charge)})</span>
        <div className="meter red"><i style={{ width: `${clamp(d.timer / d.renew * 100, 0, 100)}%` }} /></div>
      </div>
      <div className="av-fine">
        By existing you agree to recurring charges of {fmtMoney(d.charge)}. Refunds are a myth.
        {d.variant === 'fine' && <> <button className="fine-close" onClick={() => E.mut(() => E.avExit(w))}>close window</button></>} © 2004 Defender Ultimate Ltd.
      </div>
    </div>
  );
}

function PrizeBody({ w, E }) {
  const d = w.data;
  return (
    <div className="prize">
      <div className="prize-title">🎉 CONGRATULATIONS!!! 🎉</div>
      <p>You are visitor <b>#{d.visitor.toLocaleString('en-US')}</b>!<br />Claim your FREE iPod right now!</p>
      <button className="prize-btn" onClick={() => E.mut(() => E.prizeClaim(w))}><Icon name="Gift" size={16} /> CLAIM PRIZE</button>
      <small>Offer expires in {Math.max(0, Math.ceil(d.timer))}s</small>
    </div>
  );
}

/* ---- overload apps ---- */
function PaintApp() {
  const ref = useRef(null), drawing = useRef(false);
  const [color, setColor] = useState('#e8322b');
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect(); c.width = Math.max(50, r.width); c.height = Math.max(50, r.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = '12px Tahoma, sans-serif'; ctx.fillStyle = '#999'; ctx.fillText('draw something while your PC melts', 8, 18);
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [(e.clientX - r.left) * (ref.current.width / r.width), (e.clientY - r.top) * (ref.current.height / r.height)]; };
  const down = (e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const ctx = ref.current.getContext('2d'); const [x, y] = pos(e); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y); ctx.stroke(); };
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
  const up = () => { drawing.current = false; };
  return (
    <div className="paint">
      <div className="paint-pal">{['#121212', '#e8322b', '#ffd23f', '#2fbf4a', '#2f6fe0', '#d14cff', '#ffffff'].map((c) => <button key={c} aria-label={`Color ${c}`} className={c === color ? 'on' : ''} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
      <canvas ref={ref} className="paint-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
    </div>
  );
}
const calcOp = (a, b, op) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b);
const calcFmt = (v) => (isFinite(v) ? String(+v.toPrecision(10)) : 'Nice try');
function calcPress(d, k) {
  if (/[0-9]/.test(k)) { d.disp = d.fresh || d.disp === '0' || d.disp === 'Nice try' ? k : d.disp.length < 12 ? d.disp + k : d.disp; d.fresh = false; }
  else if (k === '.') { if (d.fresh) { d.disp = '0.'; d.fresh = false; } else if (!d.disp.includes('.')) d.disp += '.'; }
  else if (k === 'C') { d.disp = '0'; d.acc = null; d.op = null; d.fresh = true; }
  else if (k === '=') { if (d.op != null) { d.disp = calcFmt(calcOp(d.acc, parseFloat(d.disp), d.op)); d.acc = null; d.op = null; d.fresh = true; } }
  else { const cur = parseFloat(d.disp) || 0; if (d.op != null && !d.fresh) { d.acc = calcOp(d.acc, cur, d.op); d.disp = calcFmt(d.acc); } else d.acc = cur; d.op = k; d.fresh = true; }
}
function CalcApp({ d, E }) {
  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', 'C', '0', '.', '+'];
  return (
    <div className="calc">
      <div className="calc-disp">{d.disp}</div>
      <div className="calc-keys">
        {keys.map((k) => <button key={k} className="xp-b" onClick={() => E.mut(() => calcPress(d, k))}>{k}</button>)}
        <button className="xp-b calc-eq" onClick={() => E.mut(() => calcPress(d, '='))}>=</button>
      </div>
    </div>
  );
}
function SolitaireApp({ d, E }) {
  return (
    <div className="sol">
      <div className="sol-cards">
        {d.cards.map((c, i) => (
          <button key={i} className={`card ${c.up ? 'up' : ''} ${c.s === '♥' || c.s === '♦' ? 'red' : ''}`} onClick={() => E.mut(() => { c.up = !c.up; Sound.play('click'); })}>
            {c.up ? <><span>{c.r}</span><span className="suit">{c.s}</span></> : null}
          </button>
        ))}
      </div>
      <button className="xp-b" onClick={() => E.mut(() => { d.cards = dealCards(); Sound.play('whoosh'); })}>Deal again</button>
    </div>
  );
}
function MediaApp({ d, E }) {
  return (
    <div className="media">
      <div className={`media-viz ${d.playing ? 'on' : ''}`}>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.13) % 0.9}s` }} />)}</div>
      <div className="media-track">smooth_jazz_FINAL_v2.wma</div>
      <button className="xp-b" onClick={() => E.mut(() => { d.playing = !d.playing; if (d.playing) Sound.play('jingle'); })}>
        <Icon name={d.playing ? 'Pause' : 'Play'} size={14} /> {d.playing ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
function minesOpen(cells, i) {
  const stack = [i];
  while (stack.length) {
    const j = stack.pop(), c = cells[j]; if (c.open) continue; c.open = true;
    if (c.n === 0 && !c.mine) { const x = j % 6, y = Math.floor(j / 6); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < 6 && ny < 6) stack.push(ny * 6 + nx); } }
  }
}
function MinesApp({ w, d, E }) {
  const click = (i) => E.mut(() => {
    const c = d.cells[i]; if (c.open) return;
    if (c.mine) { E.heat(3, w); E.log('Minesweeper: boom! The explosion warmed your CPU. +3°C', 'bad'); Sound.play('boom'); d.cells = newMines(); d.status = 'Boom. New board.'; return; }
    minesOpen(d.cells, i); Sound.play('click');
    if (d.cells.filter((x) => !x.open && !x.mine).length === 0) { d.status = 'You won Minesweeper! Still overloaded though.'; Sound.play('good'); d.cells = newMines(); }
  });
  return (
    <div className="mines">
      <div className="mines-status">{d.status}</div>
      <div className="mines-grid">
        {d.cells.map((c, i) => <button key={i} className={`mine ${c.open ? 'open' : ''} n${c.n}`} onClick={() => click(i)}>{c.open && c.n > 0 ? c.n : ''}</button>)}
      </div>
    </div>
  );
}
function AppBody({ w, E }) {
  const d = w.data; let inner = null;
  switch (d.app) {
    case 'notepad': inner = <textarea className="np" value={d.text} spellCheck={false} onChange={(e) => { d.text = e.target.value; E.render(); }} />; break;
    case 'paint': inner = <PaintApp />; break;
    case 'calc': inner = <CalcApp d={d} E={E} />; break;
    case 'solitaire': inner = <SolitaireApp d={d} E={E} />; break;
    case 'media': inner = <MediaApp d={d} E={E} />; break;
    case 'mines': inner = <MinesApp w={w} d={d} E={E} />; break;
    default: break;
  }
  const conf = APP_CONFIRM[d.app];
  return (
    <div className="app">
      {inner}
      {d.confirm && conf && (
        <div className="app-confirm">
          <div className="dlg">
            <div className="dlg-msg flex items-start gap-2"><Icon name="AlertTriangle" size={22} /><p>{conf.text}</p></div>
            <div className="dlg-btns">
              <button className="xp-b" onClick={() => E.mut(() => E.closeApp(w))}>{conf.yes}</button>
              <button className="xp-b" onClick={() => E.mut(() => { d.confirm = false; })}>{conf.no}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- utilities ---- */
function TaskMgrBody({ w, s, E }) {
  const t = s.elapsed, sel = w.data.sel;
  const procs = [
    { pid: 'sys-idle', name: 'System Idle Process', user: 'SYSTEM', cpu: Math.max(0, Math.round(98 - s.chaos)), mem: '16 K' },
    { pid: 'sys-explorer', name: 'explorer.exe', user: 'You', cpu: 1, mem: '18,204 K' },
    { pid: 'sys-svchost', name: 'svchost.exe', user: 'SYSTEM', cpu: 0, mem: '4,880 K' },
    ...s.windows.filter((x) => !x.closing).map((x) => {
      const scam = SCAM_KINDS.has(x.kind);
      return { pid: x.id, name: procName(x), user: scam ? (x.kind === 'tech' ? 'Kevin' : 'UNKNOWN') : 'You', cpu: Math.max(1, Math.round((scam ? 18 : 2) + 6 * Math.sin(t * 1.7 + x.id))), mem: `${(x.id * 977) % 90000 + 2100} K`, scam };
    }),
  ];
  const selected = procs.find((p) => p.pid === sel);
  return (
    <div className="tm">
      <div className="tm-tabs"><span className="on">Processes</span><span>Performance</span><span>Networking</span></div>
      <div className="tm-table">
        <div className="tm-row head"><span>Image name</span><span>User</span><span>CPU</span><span>Mem</span></div>
        {procs.map((p) => (
          <button key={p.pid} className={`tm-row ${sel === p.pid ? 'sel' : ''} ${p.scam ? 'scam' : ''}`} onClick={() => E.mut(() => { w.data.sel = p.pid; Sound.play('click'); })} onDoubleClick={() => E.mut(() => E.endProcess(w, p.pid))}>
            <span>{p.name}</span><span>{p.user}</span><span>{String(p.cpu).padStart(2, '0')}</span><span>{p.mem}</span>
          </button>
        ))}
      </div>
      <div className="tm-foot">
        <span>Processes: {procs.length} | CPU temp: {Math.round(s.cpu)}°C</span>
        <button className="xp-b" disabled={!selected} onClick={() => E.mut(() => E.endProcess(w, sel))}>End Process</button>
      </div>
    </div>
  );
}
function TerminalBody({ s }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [s.log.length]);
  return (
    <div className="term" ref={ref}>
      {s.log.map((l) => <div key={l.id} className={`tl ${l.kind}`}><span className="tt">[{fmtClock(l.t)}]</span> {l.msg}</div>)}
      <div className="tl cursor">C:\&gt;<span className="caret">_</span></div>
    </div>
  );
}
function FanBody({ s, E }) {
  const dur = s.fanSpin > 0.05 ? Math.max(0.12, 1.6 / (1 + s.fanSpin)) : 0;
  return (
    <div className="fan">
      <div className="fan-wheel" style={{ animationDuration: dur ? `${dur}s` : '0s', animationPlayState: dur ? 'running' : 'paused' }}><Icon name="Fan" size={96} strokeWidth={1.6} /></div>
      <div className="fan-temp">CPU {Math.round(s.cpu)}°C</div>
      <button className="fan-btn" onClick={() => E.mut(() => E.fanSpin())}>SPIN THE FAN</button>
      <small>Each spin cools 1.2°C. Spin faster for extra airflow.</small>
    </div>
  );
}
function MyCompBody({ s }) {
  const rows = [['Processor', 'Pentium 4 @ 1.4 GHz (very tired)'], ['Memory', '256 MB (and 0 MB of patience)'], ['CPU temperature', `${Math.round(s.cpu)}°C`], ['Bank balance', fmtMoney(s.money)], ['Money lost to scams', fmtMoney(s.moneyLost)], ['Scams defeated', String(s.defeated)], ['Uptime', fmtClock(s.elapsed)], ['Drive C:', '99% full of pop-ups']];
  return (
    <div className="mycomp">
      <div className="mycomp-head"><Pixel name="computer" size={44} /><div><b>System Properties</b><div>Microsoft Windows XP — Scam Edition</div></div></div>
      <table><tbody>{rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table>
    </div>
  );
}
function RecycleBody({ w, s, E }) {
  const files = s.recycleUsed ? [] : ['old_homework.doc', 'savings.xls', 'mixtape_2002.mp3', 'resignation_letter_draft.txt'];
  return (
    <div className="flex flex-col gap-2 h-full p-2">
      <div className="recycle-list">
        {files.length ? files.map((f) => <div key={f} className="recycle-item"><Icon name="FileText" size={14} /> {f}</div>) : <div className="recycle-empty">The Recycle Bin is empty. You already found the money.</div>}
      </div>
      <button className="xp-b" disabled={s.recycleUsed} onClick={() => E.mut(() => E.emptyBin(w))}><Icon name="Trash2" size={14} /> Empty Recycle Bin</button>
    </div>
  );
}

/* ================= Window frame ================= */
export function XPWindow({ w, s, E }) {
  const drag = useRef(null);
  const active = s.focus === w.id;
  const onDown = (e) => {
    if (e.target.closest('button')) return;
    E.mut(() => E.focus(w.id));
    drag.current = { sx: e.clientX, sy: e.clientY, ox: w.x, oy: w.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const onMove = (e) => {
    if (!drag.current) return; const b = s.bounds;
    w.x = clamp(drag.current.ox + e.clientX - drag.current.sx, -w.w + 90, b.w - 90);
    w.y = clamp(drag.current.oy + e.clientY - drag.current.sy, 0, b.h - 32);
    E.render();
  };
  const onUp = () => { drag.current = null; };
  let body = null;
  switch (w.kind) {
    case 'download': body = <DownloadBody w={w} E={E} />; break;
    case 'tech': body = <TechBody w={w} E={E} />; break;
    case 'crypto': body = <CryptoBody w={w} E={E} s={s} />; break;
    case 'antivirus': body = <AntivirusBody w={w} E={E} />; break;
    case 'prize': body = <PrizeBody w={w} E={E} />; break;
    case 'app': body = <AppBody w={w} E={E} />; break;
    case 'taskmgr': body = <TaskMgrBody w={w} s={s} E={E} />; break;
    case 'terminal': body = <TerminalBody s={s} />; break;
    case 'fan': body = <FanBody s={s} E={E} />; break;
    case 'mycomp': body = <MyCompBody s={s} />; break;
    case 'recycle': body = <RecycleBody w={w} s={s} E={E} />; break;
    default: break;
  }
  const cls = ['xpwin', `k-${w.kind}`, active ? 'active' : 'inactive', w.closing ? 'closing' : '', w.shakeUntil > s.elapsed ? 'wshake' : ''].join(' ');
  return (
    <div className={cls} style={{ left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z, display: w.minimized ? 'none' : 'flex' }}
      onPointerDown={() => { if (!active || s.startOpen) E.mut((st) => { E.focus(w.id); st.startOpen = false; }); }}>
      <div className="xptitle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Icon name={titleIcon(w)} size={14} className="ticon" />
        <span className="ttext">{w.title}</span>
        <button className="tbtn" aria-label="Minimize" onClick={() => E.mut(() => E.minimize(w.id))}><Icon name="Minus" size={12} strokeWidth={3} /></button>
        {w.kind === 'tech' ? <span className="tbtn ghost" /> : (
          <button className="tbtn close" aria-label="Close" onClick={() => E.mut(() => E.tryClose(w.id))}><Icon name="X" size={13} strokeWidth={3} /></button>
        )}
      </div>
      {w.kind === 'tech' && (
        <button tabIndex={-1} aria-label="Close" className="tbtn close dodge"
          style={w.data.xPos ? { left: w.data.xPos.left, top: w.data.xPos.top } : { right: 5, top: 4 }}
          onPointerEnter={() => E.mut(() => E.dodge(w))}
          onClick={() => E.mut(() => { E.dodge(w); E.log('Access denied: Kevin has admin rights. Use Task Manager.', 'warn'); Sound.play('error'); })}>
          <Icon name="X" size={13} strokeWidth={3} />
        </button>
      )}
      <div className="xpbody">{body}</div>
    </div>
  );
}

/* ================= HUD, taskbar, start menu ================= */
function HudStat({ icon, label, value, pct, tone, pulse }) {
  return (
    <div className={`hstat t-${tone} ${pulse ? 'pulse' : ''}`}>
      <div className="hstat-top"><Icon name={icon} size={14} /><span className="hl">{label}</span><span className="hv">{value}</span></div>
      <div className="hbar"><i style={{ width: `${clamp(pct, 0, 100)}%` }} /></div>
    </div>
  );
}
export function Hud({ s, E, muted, onToggleMute, player, matchLabel, mp, netStatus }) {
  const fake = s.fakeHudUntil > s.elapsed;
  const cpu = fake ? 99 : s.cpu, money = fake ? 3 : s.money, mMax = s.moneyMax || START_MONEY;
  const cpuTone = cpu >= 85 ? 'red' : cpu >= 65 ? 'amber' : 'cyan';
  return (
    <div className="hud">
      <div className="hud-brand"><span>ANTI-SCAM</span><span>ARCADE</span></div>
      <div className="hud-stats">
        <HudStat icon="Timer" label="Survive" value={fmtTime(GAME_LEN - s.elapsed)} pct={(s.elapsed / GAME_LEN) * 100} tone="lime" />
        <HudStat icon="Wallet" label={mp === 'coop' ? 'Team bank' : 'Bank'} value={fmtMoney(money)} pct={(money / mMax) * 100} tone={money < 1000 ? 'red' : 'green'} pulse={money < 1000} />
        <HudStat icon="Thermometer" label={mp === 'coop' ? 'Shared CPU' : 'CPU'} value={`${Math.round(cpu)}°C`} pct={((cpu - 32) / 68) * 100} tone={cpuTone} pulse={cpu >= 85} />
        <HudStat icon="Zap" label="Chaos" value={`${Math.round(s.chaos)}%`} pct={s.chaos} tone="magenta" pulse={s.chaos >= 75} />
      </div>
      <div className="hud-side">
        <div className="hud-chip" title="Wave"><Icon name="Flag" size={13} /> {s.wave}/{TOTAL_WAVES}</div>
        <div className="hud-chip" title="Scams defeated"><Icon name="ShieldCheck" size={13} /> {s.defeated}</div>
        <button className="hud-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}><Icon name={muted ? 'VolumeX' : 'Volume2'} size={15} /></button>
        {mp && netStatus !== 'open' && <div className="hud-chip warn" title="Connection lost"><Icon name="WifiOff" size={13} /> Reconnecting</div>}
        {mp ? <button className="hud-btn" aria-label="How to play" onClick={() => E.mut((st) => { st.showHelp = true; })}><Icon name="HelpCircle" size={15} /></button>
          : <button className="hud-btn" aria-label="Pause" onClick={() => E.mut((st) => { if (st.phase === 'playing') st.paused = true; })}><Icon name="Pause" size={15} /></button>}
      </div>
      <div className="hud-player">{matchLabel ? `${matchLabel} — ` : ''}{player}</div>
    </div>
  );
}
export function Taskbar({ s, E, muted, onToggleMute }) {
  const list = s.windows.filter((w) => !w.closing);
  return (
    <div className="taskbar">
      <button className={`startbtn ${s.startOpen ? 'on' : ''}`} onClick={() => E.mut((st) => { st.startOpen = !st.startOpen; Sound.play('click'); })}>
        <span className="flag"><i /><i /><i /><i /></span><span>start</span>
      </button>
      <div className="tasks">
        {s.explorerDown > 0 ? <span className="task-note">explorer.exe restarting… {Math.ceil(s.explorerDown)}s</span> : list.map((w) => (
          <button key={w.id} className={`taskbtn ${s.focus === w.id && !w.minimized ? 'on' : ''} ${SCAM_KINDS.has(w.kind) ? 'scam' : ''}`} onClick={() => E.mut(() => E.taskClick(w.id))} title={w.title}>
            <Icon name={titleIcon(w)} size={14} /><span>{w.title}</span>
          </button>
        ))}
      </div>
      <div className="tray">
        <button className="tray-btn" aria-label="Open Task Manager" title="Task Manager" onClick={() => E.mut(() => E.openUtil('taskmgr'))}><Icon name="Activity" size={15} /></button>
        <button className="tray-btn" aria-label="Open CoolFan" title="CoolFan.exe" onClick={() => E.mut(() => E.openUtil('fan'))}><Icon name="Fan" size={15} /></button>
        <button className="tray-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}><Icon name={muted ? 'VolumeX' : 'Volume2'} size={15} /></button>
        <span className="clock">{fmtTime(GAME_LEN - s.elapsed)}</span>
      </div>
    </div>
  );
}
export function StartMenu({ s, E, player, muted, onToggleMute, mp }) {
  const item = (pix, label, sub, fn) => (
    <button className="sm-item" onClick={() => E.mut(fn)}>
      <Pixel name={pix} size={30} /><span><b>{label}</b><small>{sub}</small></span>
    </button>
  );
  return (
    <div className="startmenu" onPointerDown={(e) => e.stopPropagation()}>
      <div className="sm-head"><div className="sm-avatar"><Icon name="Gamepad2" size={22} /></div><b>{player}</b></div>
      <div className="sm-cols">
        <div className="sm-left">
          {item('taskmgr', 'Task Manager', 'End sneaky processes', () => E.openUtil('taskmgr'))}
          {item('fan', 'CoolFan.exe', 'Spin to cool your CPU', () => E.openUtil('fan'))}
          {item('terminal', 'Event Terminal', 'Live log of everything', () => E.openUtil('terminal'))}
          {item('computer', 'My Computer', 'System status', () => E.openUtil('mycomp'))}
          {item('recycle', 'Recycle Bin', 'Something valuable inside?', () => E.openUtil('recycle'))}
        </div>
        <div className="sm-right">
          <button className="sm-ritem" onClick={() => E.mut((st) => { st.startOpen = false; st.showHelp = true; if (!mp) st.paused = true; })}><Icon name="HelpCircle" size={16} /> How to play</button>
          {!mp && <button className="sm-ritem" onClick={() => E.mut((st) => { st.startOpen = false; st.paused = true; })}><Icon name="Pause" size={16} /> Pause game</button>}
          <button className="sm-ritem" onClick={() => { onToggleMute(); E.mut((st) => { st.startOpen = false; }); }}><Icon name={muted ? 'Volume2' : 'VolumeX'} size={16} /> {muted ? 'Turn sound on' : 'Turn sound off'}</button>
        </div>
      </div>
      <div className="sm-foot">
        <button className="sm-off" onClick={() => E.mut((st) => { st.startOpen = false; if (!mp) st.paused = true; st.confirmQuit = true; })}><Icon name="Power" size={16} /> {mp ? 'Forfeit' : 'End run'}</button>
      </div>
    </div>
  );
}
const DESK_ICONS = [
  { id: 'mycomp', label: 'My Computer', pix: 'computer' }, { id: 'recycle', label: 'Recycle Bin', pix: 'recycle' },
  { id: 'taskmgr', label: 'Task Manager', pix: 'taskmgr' }, { id: 'fan', label: 'CoolFan.exe', pix: 'fan' },
  { id: 'terminal', label: 'Event Terminal', pix: 'terminal' }, { id: 'help', label: 'How to Play', pix: 'help' },
];
export function DesktopIcons({ E, mp }) {
  return (
    <div className="desk-icons">
      {DESK_ICONS.map((ic) => (
        <button key={ic.id} className="desk-icon" onClick={() => E.mut((st) => { if (ic.id === 'help') { st.showHelp = true; if (!mp) st.paused = true; } else E.openUtil(ic.id); })}>
          <Pixel name={ic.pix} size={38} /><span>{ic.label}</span>
        </button>
      ))}
    </div>
  );
}
