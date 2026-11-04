/* Anti-Scam Arcade — game data, sound, storage and the simulation engine. */
import { GAME_LEN, WAVE_EVERY, FIRST_WAVE, TOTAL_WAVES, START_MONEY, START_CPU, SABOTAGES, GLOBAL_EVENTS, computeScore } from '../../shared/rules.js';
export { GAME_LEN, WAVE_EVERY, FIRST_WAVE, TOTAL_WAVES, START_MONEY, START_CPU };

/* ---------- utils ---------- */
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const weighted = (opts) => { const tot = opts.reduce((t, o) => t + o[1], 0); let r = Math.random() * tot; for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; } return opts[opts.length - 1][0]; };
export const sum = (a) => a.reduce((t, v) => t + v, 0);
export const fmtMoney = (v) => '$' + Math.max(0, Math.round(v)).toLocaleString('en-US');
export const fmtTime = (sec) => { const t = Math.max(0, Math.ceil(sec)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
export const fmtClock = (sec) => { const t = Math.max(0, Math.floor(sec)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
export const fmtNum = (v) => (v >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(v >= 10 ? 1 : 2));
export const fmtPrice = (p) => (p >= 1 ? p.toFixed(3) : p >= 0.01 ? p.toFixed(4) : p.toFixed(6));

/* ---------- game data ---------- */
export const SCAM_INFO = {
  download: { name: 'Fake Download', icon: 'Download' },
  tech: { name: 'Tech Support Scam', icon: 'Phone' },
  crypto: { name: 'Crypto Scam', icon: 'Bitcoin' },
  antivirus: { name: 'Fake Antivirus', icon: 'ShieldAlert' },
  overload: { name: 'System Overload', icon: 'Cpu' },
  prize: { name: 'Prize Pop-up', icon: 'Gift' },
};
export const SCAM_KINDS = new Set(['download', 'tech', 'crypto', 'antivirus', 'app', 'prize']);
export const SIZES = {
  download: { w: 450, h: 390 }, tech: { w: 420, h: 370 }, crypto: { w: 470, h: 440 }, antivirus: { w: 450, h: 470 },
  prize: { w: 300, h: 240 }, taskmgr: { w: 440, h: 380 }, terminal: { w: 410, h: 240 }, fan: { w: 270, h: 310 },
  mycomp: { w: 350, h: 310 }, recycle: { w: 330, h: 300 }, app: { w: 300, h: 240 },
};
const TITLES = {
  tech: 'Windoes Support — Remote Session', antivirus: 'Defender Ultimate 2004 — SECURITY ALERT', prize: '!!! YOU ARE A WINNER !!!',
  taskmgr: 'Windows Task Manager', terminal: 'Event Terminal', fan: 'CoolFan.exe', mycomp: 'My Computer', recycle: 'Recycle Bin',
};
const DL_OFFERS = [
  { title: 'FreeMovies4K — Mirror 3 of 47', file: 'Movie_4K_FULL_HD.mp4' },
  { title: 'MegaFiles — Your file is ready!', file: 'holiday_photos.zip' },
  { title: 'CodecHub — Codec required to play video', file: 'codec_pack.zip' },
  { title: 'GameZone — Free full version!', file: 'pinball_deluxe.zip' },
  { title: 'TaxHelper — Your refund form', file: 'refund_form.pdf' },
];
const REAL_DOMAINS = ['files.openmirror.org', 'cdn.trustedfiles.net', 'downloads.safemirror.org', 'mirror.cleanfiles.com'];
const FAKE_DOMAINS = ['d0wnload-n0w.ru', 'free-ram-4u.biz', 'totally-not-a-virus.net', 'click-here-winner.info', 'fast-mirror.top', 'h0tfiles.cc', 'best-codec-pack.ws', 'megadl-free.xyz'];
const FAKE_PATTERNS = [(b, e) => `${b}.${e}.exe`, (b) => `${b}.exe`, (b) => `${b}.scr`, (b) => `setup_${b}.bat`, (b, e) => `${b}.${e}.vbs`, (b) => `${b}_installer.exe`];
const DL_PROCS = ['DownloadHelper.exe', 'FreeDL_Setup.exe', 'MirrorClient32.exe', 'TurboGrabber.exe'];

const TECH_LINES = [
  'Hello sir, this is Kevin from Windows. Your computer has sent us 4,000 errors.',
  'I am now connected to your computer. Please do not touch the mouse.',
  'I see a very dangerous virus called “System32”. I will delete it for you.',
  'For the security fee please purchase 4 gift cards of $500 each.',
  'Sir why are you moving the mouse to the X? The X is not for you.',
  'My manager says this is the biggest virus he has ever seen.',
  'Please do not hang up sir, I am also charging you per minute.',
  'I will now type “tree” into the command prompt. Very serious hacking.',
  'Your IP address is 127.0.0.1. Very compromised. Very bad.',
  'Sir, your firewall is not even on fire. This is a problem.',
];
const TECH_HINT = 'Whatever you do sir, do NOT open the Task Manager.';
const TECH_PROCS = ['RemoteKevin.exe', 'TechSupp0rt.exe', 'WinHelpDesk32.exe', 'ScamViewer.exe'];

const COINS = ['$SCAM', '$RUGG', '$MOON', '$YOLO', '$HODL'];
const HYPE = [
  '🚀 Influencer with 3 followers just posted “WOW”', '📈 Analysts predict 10,000x by Tuesday', '🐸 Someone posted a frog emoji in the group chat',
  '💎 Diamond hands only. Paper hands get banned.', '🌕 Next stop: the actual Moon', '🤑 My cousin bought a lambo (allegedly)', '🔥 Whitepaper is just the word “up” 400 times',
];
const WARN = ['👀 Dev wallet is moving funds…', '⚠️ Liquidity pool shrinking fast', '🚪 Telegram admin left the group', '🔒 Withdrawals “temporarily paused”'];

export const THREATS = [
  ['grandma_recipes.doc', 'Trojan.Spaghetti'], ['homework_FINAL_final2.doc', 'Worm.Procrastinate'], ['vacation_2003.jpg', 'Spyware.Sunburn'],
  ['solitaire.exe', 'Backdoor.KingOfHearts'], ['comic.ttf', 'Virus.ComicSans'], ['mouse_driver.sys', 'Adware.Squeak'], ['desktop.ini', 'Rootkit.Wallpaper'],
  ['my_resume.doc', 'Trojan.Unemployed'], ['cat_video.avi', 'Malware.Meow'], ['clock.exe', 'Ransom.TimeIsMoney'], ['notepad.exe', 'Keylogger.DearDiary'], ['boot.ini', 'Virus.ShoeLace'],
];
export const SCAN_PATHS = ['C:\\WINDOWS\\system32\\drivers', 'C:\\Documents and Settings\\You\\Desktop', 'C:\\Program Files\\Pinball', 'C:\\WINDOWS\\Fonts\\comic.ttf', 'C:\\My Music\\ringtones', 'C:\\WINDOWS\\Temp\\~fear.tmp'];
export const EULA = [
  '1. By reading this sentence you agree to a monthly subscription.',
  '2. Defender Ultimate may detect viruses that do not exist, for your safety.',
  '3. The “Cancel” button is a premium feature and incurs a cancellation fee.',
  '4. Refunds will be processed within 4 to 6 business centuries.',
  '5. You agree that the X button is decorative and protected by copyright.',
  '6. Defender Ultimate is not responsible for anything, ever.',
  '7. If you have read this far, congratulations. You are the first.',
];

export const APPS = [
  { id: 'notepad', title: 'Untitled - Notepad', proc: 'notepad.exe', icon: 'FileText', w: 300, h: 230 },
  { id: 'paint', title: 'untitled - Paint', proc: 'mspaint.exe', icon: 'Paintbrush', w: 320, h: 270 },
  { id: 'calc', title: 'Calculator', proc: 'calc.exe', icon: 'Calculator', w: 230, h: 300 },
  { id: 'solitaire', title: 'Solitaire', proc: 'sol.exe', icon: 'Spade', w: 320, h: 230 },
  { id: 'media', title: 'Windows Media Player', proc: 'wmplayer.exe', icon: 'Music', w: 300, h: 230 },
  { id: 'mines', title: 'Minesweeper', proc: 'winmine.exe', icon: 'Bomb', w: 230, h: 290 },
];
export const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a.id, a]));
export const APP_CONFIRM = {
  notepad: { text: 'Do you want to save changes to Untitled?', yes: 'Don’t save', no: 'Cancel' },
  solitaire: { text: 'Quit Solitaire? You were one move away from winning!', yes: 'Quit anyway', no: 'Keep playing' },
};
const NOTEPAD_TEXT = 'Dear diary,\nToday my computer opened 47 programs by itself. I think it is trying to tell me something.\n\nTo-do:\n- buy RAM\n- download more RAM\n- stop downloading RAM';

const FUNNY = [
  ['Windows Update', 'Installing update 1 of 4,812. Please do not turn off your hopes.', 'RefreshCw'],
  ['Printer', 'Your printer is out of cyan. You do not own a printer.', 'Printer'],
  ['Low Disk Space', 'Drive C: is 99% full of pop-ups.', 'HardDrive'],
  ['Network', 'A network cable is unplugged. It was never plugged in.', 'Wifi'],
  ['Security Center', 'Your firewall is now literally on fire.', 'Flame'],
  ['Battery', 'Mouse battery low. Please wiggle harder.', 'Battery'],
  ['Messenger', 'Kevin (Windows Support) has signed in.', 'MessageCircle'],
];
const TIPS = {
  download: 'Fake downloads: hover each DOWNLOAD button and read the status bar. Only https:// with the exact file name is real.',
  tech: 'Tech support scam: the X runs away. Open Task Manager (taskbar or Start) and end Kevin’s process.',
  crypto: 'Crypto scam: you can’t leave until the crash. Buy low, and SELL when the news turns suspicious.',
  antivirus: 'Fake antivirus: every big button costs money. Look for the real exit in the fine print, the license box or the file list.',
  overload: 'System overload: close the apps as fast as they open. Some ask “are you sure?”',
  prize: 'Prize pop-up: never claim. Its X button is the real one.',
};

/* ---------- sound ---------- */
export const Sound = {
  ctx: null, master: null, muted: false,
  init() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.45; this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* audio unavailable */ }
  },
  tone(f, d, type = 'square', v = 0.08, f2 = null, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.03);
  },
  noise(d, v = 0.08, delay = 0, hp = 600) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * d)), c.sampleRate);
    const data = buf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + d + 0.02);
  },
  play(n) {
    try {
      switch (n) {
        case 'click': this.tone(900, 0.04, 'square', 0.03); break;
        case 'open': this.tone(520, 0.06, 'square', 0.04); this.tone(780, 0.08, 'square', 0.04, null, 0.06); break;
        case 'close': this.tone(700, 0.08, 'triangle', 0.07, 300); break;
        case 'error': this.tone(392, 0.16, 'sine', 0.12); this.tone(294, 0.26, 'sine', 0.1, null, 0.08); break;
        case 'cash': this.tone(660, 0.08, 'square', 0.05, 330); this.tone(440, 0.14, 'square', 0.05, 180, 0.08); break;
        case 'good': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'square', 0.045, null, i * 0.06)); break;
        case 'coin': this.tone(988, 0.05, 'square', 0.05); this.tone(1319, 0.14, 'square', 0.05, null, 0.05); break;
        case 'wave': this.tone(220, 0.16, 'sawtooth', 0.05, 440); this.tone(440, 0.22, 'sawtooth', 0.045, 880, 0.12); break;
        case 'alarm': for (let i = 0; i < 3; i++) { this.tone(880, 0.09, 'square', 0.045, null, i * 0.2); this.tone(660, 0.09, 'square', 0.045, null, i * 0.2 + 0.1); } break;
        case 'crash': this.noise(0.45, 0.12, 0, 300); this.tone(320, 0.6, 'sawtooth', 0.07, 40); break;
        case 'boom': this.noise(0.3, 0.14, 0, 120); this.tone(120, 0.35, 'sine', 0.12, 40); break;
        case 'boing': this.tone(260, 0.16, 'sine', 0.09, 980); break;
        case 'whoosh': this.noise(0.12, 0.05, 0, 1800); break;
        case 'notify': this.tone(1175, 0.07, 'sine', 0.05); this.tone(1568, 0.12, 'sine', 0.045, null, 0.07); break;
        case 'jingle': [392, 494, 587, 494, 659].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, i * 0.15)); break;
        case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'square', 0.05, null, i * 0.12)); break;
        case 'lose': [494, 440, 392, 330, 247].forEach((f, i) => this.tone(f, 0.24, 'sawtooth', 0.05, null, i * 0.18)); break;
        default: break;
      }
    } catch (e) { /* ignore */ }
  },
};

/* ---------- storage ---------- */
export const STORE_KEY = 'antiScamArcade.v1';
export const defaultStore = () => ({ leaderboard: [], best: { score: 0, survival: 0, money: 0, defeated: 0 }, gamesPlayed: 0, wins: 0, matches: [], lastName: '', muted: false, seenTutorial: false });
export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    const s = JSON.parse(raw); const d = defaultStore();
    return { ...d, ...s, best: { ...d.best, ...(s.best || {}) }, leaderboard: Array.isArray(s.leaderboard) ? s.leaderboard : [], matches: Array.isArray(s.matches) ? s.matches : [] };
  } catch (e) { return defaultStore(); }
}
export function saveStore(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } }

/* ---------- helpers for windows ---------- */
export function titleIcon(w) {
  switch (w.kind) {
    case 'download': return 'Download'; case 'tech': return 'Phone'; case 'crypto': return 'Bitcoin'; case 'antivirus': return 'ShieldAlert';
    case 'prize': return 'Gift'; case 'taskmgr': return 'Activity'; case 'terminal': return 'Terminal'; case 'fan': return 'Fan';
    case 'mycomp': return 'Monitor'; case 'recycle': return 'Trash2'; case 'app': return APP_BY_ID[w.data.app].icon; default: return 'Square';
  }
}
export function procName(w) {
  switch (w.kind) {
    case 'download': return w.data.proc; case 'tech': return w.data.proc; case 'crypto': return 'ScamCoinMiner.exe'; case 'antivirus': return 'DefenderUltimate.exe';
    case 'prize': return 'prize_claim.exe'; case 'app': return APP_BY_ID[w.data.app].proc; case 'taskmgr': return 'taskmgr.exe'; case 'terminal': return 'cmd.exe';
    case 'fan': return 'coolfan.exe'; case 'mycomp': return 'sysprops.exe'; case 'recycle': return 'recycler.exe'; default: return 'unknown.exe';
  }
}
export function newMines() {
  const cells = Array.from({ length: 36 }, () => ({ mine: false, open: false, n: 0 }));
  shuffle([...Array(36).keys()]).slice(0, 5).forEach((i) => { cells[i].mine = true; });
  cells.forEach((c, i) => { const x = i % 6, y = Math.floor(i / 6); let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < 6 && ny < 6 && cells[ny * 6 + nx].mine) n++; } c.n = n; });
  return cells;
}
export const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const dealCards = () => Array.from({ length: 5 }, () => ({ r: pick(RANKS), s: pick(SUITS), up: Math.random() < 0.5 }));

function clippyTip(s) {
  const open = (k) => s.windows.some((w) => w.kind === k && !w.closing);
  if (open('tech')) return 'It looks like Kevin won’t let you close him. Have you tried ending his process in Task Manager?';
  if (open('download')) return 'It looks like you’re downloading something. Hover the buttons and read the status bar at the bottom!';
  if (open('antivirus')) return 'Real software always lets you leave. Check the fine print, the license box and the file list.';
  if (open('crypto')) return 'It looks like you’re investing. When the news gets weird, SELL.';
  if (s.cpu > 70) return 'Your CPU is toasty. Open CoolFan.exe and spin that fan!';
  return pick(['It looks like you’re being scammed. Would you like help with that?', 'Fun fact: no real company asks to be paid in gift cards.', 'Tip: minimized windows still run. Hiding a scam won’t stop it.']);
}

export function newGame() {
  return {
    elapsed: 0, money: START_MONEY, cpu: START_CPU, chaos: 0, defeated: 0, wave: 0, nextWave: FIRST_WAVE,
    windows: [], z: 10, uid: 1, focus: null, log: [], toasts: [], floaters: [],
    phase: 'playing', paused: false, showHelp: false, confirmQuit: false, startOpen: false,
    banner: null, bsodUntil: -1, shakeUntil: -1, explorerDown: 0, recycleUsed: false,
    moneyLost: 0, maxCpu: START_CPU, fanSpin: 0, overload: null, lastSurge: -99, nuisanceIn: 11,
    queue: shuffle(['download', 'tech', 'crypto', 'antivirus', 'overload']), seenTips: {},
    lostBy: {}, heatBy: {}, // what cost you money and heat, by kind of window, for the end-of-run advice
    bounds: { w: 900, h: 560 }, endReason: null, hotWarned: false, poorWarned: false,
    defeatedBy: { download: 0, tech: 0, crypto: 0, antivirus: 0, overload: 0, prize: 0 },
    feed: [], emotes: [], watchers: 0, flipUntil: -1, fakeHudUntil: -1, updateUntil: -1, fanBrokenUntil: -1, fanWeakUntil: -1,
    fanClicks: 0, sabReceived: 0, wavePlan: null, dockW: 0, moneyMax: START_MONEY, helpers: 0,
  };
}

export function buildResult(s) {
  const survival = Math.min(GAME_LEN, s.elapsed);
  const won = s.phase === 'won';
  const money = Math.max(0, Math.round(s.money));
  const sc = computeScore(survival, money, s.defeated, won);
  return { won, reason: s.endReason, survival, money, defeated: s.defeated, waves: s.wave, maxCpu: Math.round(s.maxCpu), moneyLost: Math.round(s.moneyLost), fan: s.fanClicks, ...sc, defeatedBy: { ...s.defeatedBy }, lostBy: { ...(s.lostBy || {}) }, heatBy: { ...(s.heatBy || {}) } };
}

/* ---------- engine ---------- */
export function makeEngine(Gref, rerender, endRef, hooks = {}) {
  const S = () => Gref.current;
  const E = {};
  E.hooks = hooks;
  E.render = rerender;
  E.mut = (fn) => { fn(S()); rerender(); };
  E.find = (id) => S().windows.find((w) => w.id === id && !w.closing);
  E.diff = () => clamp(S().elapsed / GAME_LEN, 0, 1);

  E.log = (msg, kind = 'info') => { const s = S(); s.log.push({ id: s.uid++, t: s.elapsed, msg, kind }); if (s.log.length > 150) s.log.splice(0, s.log.length - 150); };
  E.toast = (title, body, icon = 'Info', tone = 'info') => { const s = S(); s.toasts.push({ id: s.uid++, title, body, icon, tone, until: s.elapsed + (title === 'New scam!' ? 9 : 5.5) }); if (s.toasts.length > 3) s.toasts.shift(); Sound.play('notify'); };
  E.floater = (text, color, w) => {
    const s = S();
    const x = w ? w.x + w.w / 2 : s.bounds.w / 2, y = w ? w.y + 40 : s.bounds.h / 2;
    s.floaters.push({ id: s.uid++, text, color, x: clamp(x + rand(-40, 40), 40, s.bounds.w - 40), y: clamp(y, 30, s.bounds.h - 30), until: s.elapsed + 1.4 });
  };
  E.money = (delta, msg, w, opts = {}) => {
    const s = S(); if (s.phase !== 'playing') return;
    delta = Math.round(delta * 100) / 100;
    s.money += delta;
    if (delta < 0 && !opts.trade) { s.moneyLost += -delta; const k = w ? w.kind : 'other'; s.lostBy[k] = (s.lostBy[k] || 0) + -delta; }
    if (!opts.silent) E.floater((delta < 0 ? '−' : '+') + fmtMoney(Math.abs(delta)), delta < 0 ? '#ff4f7b' : '#3dff8a', w);
    if (msg) E.log(msg, delta < 0 ? 'bad' : 'good');
    if (delta < 0 && !opts.trade && !opts.quiet) Sound.play('cash');
  };
  E.heat = (delta, w) => {
    const s = S(); s.cpu = clamp(s.cpu + delta, 32, 130);
    if (delta > 0 && w) s.heatBy[w.kind] = (s.heatBy[w.kind] || 0) + delta;
    if (Math.abs(delta) >= 3) E.floater((delta > 0 ? '+' : '−') + Math.abs(delta).toFixed(0) + '°C', delta > 0 ? '#ffb020' : '#7fe3ff', w);
  };
  E.shake = (w) => { if (w) w.shakeUntil = S().elapsed + 0.4; };

  /* windows */
  E.spawn = (kind, opts = {}) => {
    const s = S(), b = s.bounds, base = SIZES[kind] || SIZES.app;
    const w = Math.round(Math.min(opts.w || base.w, b.w - 8));
    const h = Math.round(Math.min(opts.h || base.h, b.h - 8));
    const win = {
      id: s.uid++, kind, title: opts.title || TITLES[kind] || 'Window', w, h, z: ++s.z, minimized: false, closing: false, born: s.elapsed, shakeUntil: -1, data: opts.data || {},
      x: opts.x != null ? opts.x : randi(4, Math.max(4, Math.round(Math.max(w + 8, b.w - (s.dockW || 0)) - w - 4))), y: opts.y != null ? opts.y : randi(4, Math.max(4, Math.round(b.h - h - 4))),
    };
    s.windows.push(win); s.focus = win.id;
    return win;
  };
  E.focus = (id) => { const s = S(), w = E.find(id); if (!w) return; if (w.z < s.z) w.z = ++s.z; w.minimized = false; s.focus = id; };
  E.minimize = (id) => {
    const s = S(), w = E.find(id); if (!w) return;
    w.minimized = true;
    if (s.focus === id) { const top = s.windows.filter((x) => !x.minimized && !x.closing).sort((a, b) => b.z - a.z)[0]; s.focus = top ? top.id : null; }
    Sound.play('click');
  };
  E.taskClick = (id) => { const s = S(), w = E.find(id); if (!w) return; if (w.minimized) E.focus(id); else if (s.focus === id) E.minimize(id); else E.focus(id); };
  E.remove = (id) => {
    const s = S(), w = E.find(id); if (!w) return null;
    w.closing = true; if (s.focus === id) s.focus = null;
    setTimeout(() => { s.windows = s.windows.filter((x) => x.id !== id); rerender(); }, 190);
    return w;
  };
  E.openUtil = (kind, quiet) => {
    const s = S(); s.startOpen = false;
    const ex = s.windows.find((w) => w.kind === kind && !w.closing);
    if (ex) { E.focus(ex.id); return ex; }
    const opts = {};
    if (kind === 'terminal') { const b = s.bounds, w = Math.min(SIZES.terminal.w, b.w - 8); opts.x = Math.round(b.w - w - 6); opts.y = Math.max(4, Math.round(b.h - SIZES.terminal.h - 6)); }
    if (kind === 'taskmgr') opts.data = { sel: null };
    const win = E.spawn(kind, opts);
    if (!quiet) Sound.play('open');
    return win;
  };
  E.defeat = (w, msg, type) => {
    const s = S(); s.defeated++; s.defeatedBy[type] = (s.defeatedBy[type] || 0) + 1;
    E.log(msg, 'good'); E.floater('+250 PTS', '#5ff6ff', w); Sound.play('good');
  };

  /* scams */
  E.tip = (type) => {
    const s = S(); if (s.seenTips[type]) return; s.seenTips[type] = true; E.log('TIP: ' + TIPS[type], 'tip');
    // first-time players learn each scam the moment it appears, instead of reading a manual first
    if (hooks.guided && TIPS[type]) E.toast('New scam!', TIPS[type], 'Info', 'info');
  };
  E.spawnScam = (type) => {
    const s = S(), d = E.diff(); let win = null;
    switch (type) {
      case 'download': {
        const offer = pick(DL_OFFERS), dot = offer.file.lastIndexOf('.');
        const base = offer.file.slice(0, dot), ext = offer.file.slice(dot + 1);
        const fakes = shuffle(FAKE_DOMAINS).slice(0, 4).map((dom, i) => ({ url: `http://${dom}/${shuffle(FAKE_PATTERNS)[i % FAKE_PATTERNS.length](base, ext)}`, real: false, gone: false }));
        const buttons = shuffle([...fakes, { url: `https://${pick(REAL_DOMAINS)}/${offer.file}`, real: true, gone: false }]);
        const t = Math.round(22 - 7 * d);
        win = E.spawn('download', { title: offer.title, data: { file: offer.file, buttons, timer: t, max: t, hover: null, armed: null, proc: pick(DL_PROCS) } });
        break;
      }
      case 'tech':
        win = E.spawn('tech', { data: { age: 0, nextMsg: 0.8, msgs: [], script: [TECH_LINES[0], TECH_LINES[1], TECH_HINT, ...shuffle(TECH_LINES.slice(2))], line: 0, xPos: null, dodges: 0, proc: pick(TECH_PROCS), base: 10 + 10 * d, billAcc: 0 } });
        break;
      case 'crypto': {
        const coin = pick(COINS), prices = []; let p = 1;
        for (let i = 0; i < 30; i++) { p *= Math.exp(rand(-0.03, 0.035)); prices.push(p); }
        win = E.spawn('crypto', { title: `${coin} Exchange — 1000x GUARANTEED*`, data: { coin, price: p, prices, open: p, age: 0, acc: 0, newsAcc: 0, crashAt: rand(14, 21) - 3 * d, warnLead: 3.8 - 1.4 * d, warned: false, crashed: false, post: 0, holdings: 0, lostCoins: 0, invested: 0, returned: 0, news: [pick(HYPE)] } });
        break;
      }
      case 'antivirus': {
        const variant = pick(['fine', 'eula', 'file']);
        win = E.spawn('antivirus', { h: variant === 'eula' ? 520 : 470, data: { variant, timer: 16 - 4 * d, renew: 16 - 4 * d, charge: Math.round(299 + 150 * d), threats: randi(1200, 4800), scan: 0, files: shuffle(THREATS).slice(0, 9), exitIdx: randi(4, 8) } });
        break;
      }
      case 'overload': {
        const n = Math.round(5 + 4 * d);
        s.overload = { group: s.uid++, remaining: n, next: 0, total: n };
        E.log('⚠ SYSTEM OVERLOAD: programs are launching themselves!', 'bad');
        break;
      }
      case 'prize':
        win = E.spawn('prize', { data: { timer: 12, visitor: randi(999990, 1000010) } });
        break;
      default: break;
    }
    E.tip(type);
    Sound.play('open');
    return win;
  };
  E.spawnApp = (group) => {
    const app = pick(APPS), data = { app: app.id, group, confirm: false };
    if (app.id === 'calc') Object.assign(data, { disp: '0', acc: null, op: null, fresh: true });
    if (app.id === 'mines') Object.assign(data, { cells: newMines(), status: 'Find the 30 safe squares' });
    if (app.id === 'solitaire') data.cards = dealCards();
    if (app.id === 'media') data.playing = true;
    if (app.id === 'notepad') data.text = NOTEPAD_TEXT;
    E.spawn('app', { title: app.title, w: app.w, h: app.h, data });
    Sound.play('open');
  };
  E.closeApp = (w) => { if (E.remove(w.id)) { Sound.play('close'); E.checkOverload(w.data.group); } };
  E.checkOverload = (group) => {
    const s = S(), ov = s.overload;
    if (!ov || ov.group !== group || ov.remaining > 0) return;
    if (!s.windows.some((x) => x.kind === 'app' && !x.closing && x.data.group === group)) {
      s.overload = null; E.defeat(null, 'System Overload contained. Your CPU fans sigh with relief.', 'overload'); E.heat(-6);
    }
  };

  E.tryClose = (id) => {
    const s = S(), w = E.find(id); if (!w) return; const d = w.data;
    switch (w.kind) {
      case 'download': E.money(-60, 'That X was just a picture of an X. Ad-click fee: −$60.', w); E.shake(w); Sound.play('error'); break;
      case 'tech': E.dodge(w); break;
      case 'crypto':
        if (!d.crashed) { E.log('Exchange locked: you can’t leave during an “active trading session”.', 'warn'); E.shake(w); Sound.play('error'); }
        else E.finishCrypto(w);
        break;
      case 'antivirus': {
        E.money(-100, 'Fake X! Defender charged a $100 “closing fee” and moved the window.', w); E.heat(5, w); E.shake(w);
        const b = s.bounds; w.x = randi(4, Math.max(4, Math.round(b.w - w.w - 4))); w.y = randi(4, Math.max(4, Math.round(b.h - w.h - 4)));
        Sound.play('error'); break;
      }
      case 'app':
        if (APP_CONFIRM[d.app]) { d.confirm = true; Sound.play('error'); } else E.closeApp(w);
        break;
      case 'prize': E.remove(id); E.defeat(w, 'Prize pop-up dismissed. No “free iPod”, no scam.', 'prize'); break;
      default: E.remove(id); Sound.play('close');
    }
  };
  E.dodge = (w) => {
    const d = w.data;
    d.xPos = { left: randi(8, Math.max(10, w.w - 36)), top: randi(40, Math.max(42, w.h - 34)) };
    d.dodges++; Sound.play('boing');
    if (d.dodges === 3) E.log('Kevin: “Sir, the X is not for you.” Try Task Manager instead.', 'warn');
  };
  E.downloadClick = (w, i, ptype) => {
    const d = w.data, b = d.buttons[i]; if (!b || b.gone || w.closing) return;
    if (ptype === 'touch' && d.armed !== i) { d.armed = i; d.hover = i; Sound.play('click'); return; }
    if (b.real) { E.remove(w.id); E.defeat(w, `Clean download! ${d.file} came from the real mirror.`, 'download'); return; }
    b.gone = true; d.armed = null; if (d.hover === i) d.hover = null;
    const loss = Math.round(220 + 160 * E.diff());
    E.money(-loss, `Wrong button! ${b.url.split('/').pop()} installed itself. −${fmtMoney(loss)}`, w);
    E.heat(6, w); E.shake(w); Sound.play('error');
    if (Math.random() < 0.35) E.spawnScam('prize');
  };
  E.techHangup = (w) => { E.money(-75, 'Kevin called back instantly. Reconnection fee: −$75.', w); w.data.msgs.push('Sir, we got disconnected. I have added a small fee.'); E.shake(w); };
  E.techGift = (w) => { E.money(-500, 'You bought gift cards for Kevin. He would like more.', w); w.data.msgs.push('Thank you sir! Only 3 more cards and the virus is gone. Probably.'); };

  E.cryptoStep = (w) => {
    const d = w.data;
    if (!d.crashed) {
      let r = 0.011 + 0.07 * gauss();
      if (Math.random() < 0.07) r += 0.12;
      if (Math.random() < 0.06) r -= 0.13;
      if (d.warned) r -= 0.035;
      d.price = Math.max(0.05, d.price * Math.exp(r));
    } else d.price = Math.max(0.0004, d.price * 0.3);
    d.prices.push(d.price); if (d.prices.length > 60) d.prices.shift();
    d.newsAcc += 0.35;
    if (!d.crashed && d.newsAcc > 3.2) { d.newsAcc = 0; d.news.unshift(d.warned ? pick(WARN) : pick(HYPE)); d.news = d.news.slice(0, 3); }
  };
  E.cryptoCrash = (w) => {
    const s = S(), d = w.data; d.crashed = true; d.lostCoins = d.holdings; d.holdings = 0;
    d.news.unshift('🧶 RUG PULLED. The developers have left for Bali.'); d.news = d.news.slice(0, 3);
    if (d.lostCoins > 0) E.log(`RUG PULL! Your ${fmtNum(d.lostCoins)} ${d.coin} are now worth nothing.`, 'bad');
    else E.log(`${d.coin} crashed 99.9%. Good thing you weren’t holding.`, 'good');
    s.shakeUntil = s.elapsed + 0.5; E.heat(4, w); Sound.play('crash');
  };
  E.cryptoBuy = (w, amt) => {
    const s = S(), d = w.data; if (d.crashed) return;
    if (s.money - amt < 100) { E.log('Purchase blocked: you need to keep at least $100 for rent.', 'warn'); Sound.play('error'); return; }
    d.holdings += amt / d.price; d.invested += amt;
    E.money(-amt, null, w, { trade: true });
    E.log(`Bought ${fmtNum(amt / d.price)} ${d.coin} for ${fmtMoney(amt)}.`, 'info'); Sound.play('coin');
  };
  E.cryptoSell = (w) => {
    const d = w.data; if (d.crashed || d.holdings <= 0) return;
    const val = d.holdings * d.price; d.returned += val; d.holdings = 0;
    E.money(val, `Sold all ${d.coin} for ${fmtMoney(val)}.`, w, { trade: true }); Sound.play('coin');
  };
  E.finishCrypto = (w) => {
    const s = S(), d = w.data; if (!E.remove(w.id)) return;
    const net = d.returned - d.invested;
    if (d.invested === 0) E.defeat(w, `You ignored the ${d.coin} hype. Wise.`, 'crypto');
    else if (net >= 0) E.defeat(w, `Escaped the rug pull with ${fmtMoney(net)} profit!`, 'crypto');
    else { s.moneyLost += -net; s.lostBy.crypto = (s.lostBy.crypto || 0) + -net; E.log(`You were the exit liquidity. Net loss: ${fmtMoney(-net)}.`, 'bad'); Sound.play('close'); }
  };

  E.avFake = (w, which) => {
    const d = w.data;
    if (which === 'remove') { d.threats += 1; E.money(-d.charge, `Paid ${fmtMoney(d.charge)} to Defender. Threats remaining: ${d.threats.toLocaleString()}.`, w); }
    else if (which === 'activate') { E.money(-199, 'Activated “Lifetime Protection” (expires in 4 minutes): −$199.', w); E.heat(4, w); }
    else if (which === 'cancel') E.money(-99, 'Cancelling is a premium feature. Cancellation fee: −$99.', w);
    else if (which === 'quarantine') E.money(-49, 'Quarantine requires Defender Premium: −$49. The file is still there.', w);
    E.shake(w); Sound.play('error');
  };
  E.avExit = (w) => { if (E.remove(w.id)) E.defeat(w, 'You found the real exit! Fake antivirus uninstalled.', 'antivirus'); };
  E.prizeClaim = (w) => { if (!E.remove(w.id)) return; E.money(-150, '“Free” iPod shipping and handling: −$150.', w); E.heat(3, w); };

  E.endProcess = (tm, pid) => {
    const s = S(); if (tm) tm.data.sel = null;
    if (pid === 'sys-idle') { E.heat(10); E.log('You ended System Idle Process. The CPU will now never rest. +10°C', 'bad'); Sound.play('error'); return; }
    if (pid === 'sys-explorer') { s.explorerDown = 6; E.heat(6); E.log('You ended explorer.exe. Your desktop vanished! Restarting…', 'bad'); Sound.play('crash'); return; }
    if (pid === 'sys-svchost') { E.money(-200, 'svchost.exe was important. Windows charged a $200 reactivation fee.'); Sound.play('error'); return; }
    const w = E.find(pid); if (!w) return;
    switch (w.kind) {
      case 'tech': E.remove(w.id); E.defeat(w, `Ended ${w.data.proc}. Kevin has been disconnected!`, 'tech'); break;
      case 'app': E.closeApp(w); break;
      case 'prize': E.remove(w.id); E.log('prize_claim.exe ended.', 'info'); Sound.play('close'); break;
      case 'download': case 'crypto': case 'antivirus':
        E.log(`Access is denied: ${procName(w)} is protected by ScamGuard™. Beat it inside its window.`, 'warn'); E.shake(w); Sound.play('error'); break;
      default: E.remove(w.id); Sound.play('close');
    }
  };
  E.fanSpin = () => {
    const s = S();
    if (s.fanBrokenUntil > s.elapsed) { E.log('The fan is broken! Sabotage. It’ll be back in a few seconds.', 'warn'); Sound.play('error'); return; }
    const k = s.fanWeakUntil > s.elapsed ? 0.5 : 1;
    s.cpu = Math.max(32, s.cpu - 1 * k); s.fanSpin = Math.min(12, s.fanSpin + 1.5 * k); s.fanClicks++; Sound.play('whoosh');
  };
  E.emptyBin = (w) => {
    const s = S(); if (s.recycleUsed) return; s.recycleUsed = true;
    E.money(150, 'Found $150 inside a deleted file called savings.xls!', w); Sound.play('coin');
  };

  /* chaos & surprises */
  E.allowed = (t) => { const s = S(); if (t === 'crypto') return !s.windows.some((w) => w.kind === 'crypto' && !w.closing); if (t === 'overload') return !s.overload; return true; };
  E.nextType = () => {
    const s = S(), i = s.queue.findIndex(E.allowed);
    if (i >= 0) return s.queue.splice(i, 1)[0];
    return weighted([['download', 3], ['tech', 2.5], ['antivirus', 2.5], ['crypto', 1.6], ['overload', 2]].filter((o) => E.allowed(o[0])));
  };
  E.wave = () => {
    const s = S(); s.wave++;
    const plan = s.wavePlan && s.wavePlan[s.wave - 1];
    const n = plan ? plan.length : s.wave === TOTAL_WAVES ? 2 : s.elapsed < 60 ? 1 : s.elapsed < 120 ? (Math.random() < 0.55 ? 2 : 1) : 2;
    const types = [];
    for (let i = 0; i < n; i++) {
      let t = plan ? plan[i] : E.nextType();
      if (plan) { const qi = s.queue.indexOf(t); if (qi >= 0) s.queue.splice(qi, 1); if (!E.allowed(t)) t = E.nextType(); }
      types.push(t); E.spawnScam(t);
    }
    const names = types.map((t) => SCAM_INFO[t].name);
    s.banner = { title: s.wave === TOTAL_WAVES ? 'FINAL WAVE' : `WAVE ${s.wave}`, sub: names.join(' + '), until: s.elapsed + 2.2, tone: 'wave' };
    E.log(`WAVE ${s.wave}/${TOTAL_WAVES}: ${names.join(', ')} incoming.`, 'wave');
    Sound.play('wave');
  };
  E.surge = () => {
    const s = S(); s.lastSurge = s.elapsed; const t = E.nextType(); E.spawnScam(t);
    s.banner = { title: 'CHAOS SURGE', sub: `Bonus ${SCAM_INFO[t].name}!`, until: s.elapsed + 2, tone: 'surge' };
    s.shakeUntil = s.elapsed + 0.6; E.log(`CHAOS SURGE! A bonus ${SCAM_INFO[t].name} broke loose.`, 'bad'); Sound.play('alarm');
  };
  E.nuisance = () => {
    const s = S();
    const opts = [['prize', 3], ['clippy', 2.5], ['toast', 3], ['shuffle', 1], ['shake', 1]];
    if (s.cpu > 78) opts.push(['bsod', 2]);
    if (s.moneyLost > 500) opts.push(['cashback', 1.2]);
    switch (weighted(opts)) {
      case 'prize': E.spawnScam('prize'); break;
      case 'clippy': E.toast('Clippit', clippyTip(s), 'Paperclip', 'clippy'); break;
      case 'toast': { const t = pick(FUNNY); E.toast(t[0], t[1], t[2]); E.log(`${t[0]}: ${t[1]}`, 'info'); break; }
      case 'shuffle':
        s.windows.forEach((w) => { if (!w.closing) { w.x = randi(4, Math.max(4, Math.round(s.bounds.w - w.w - 4))); w.y = randi(4, Math.max(4, Math.round(s.bounds.h - w.h - 4))); } });
        E.toast('Windows Tips', 'Your windows were rearranged “for productivity”.', 'Sparkles'); E.log('Windows rearranged all your windows. You’re welcome.', 'warn'); break;
      case 'shake': s.shakeUntil = s.elapsed + 0.7; E.toast('Device Manager', 'Gravity driver updated successfully.', 'Settings'); Sound.play('boom'); break;
      case 'bsod': s.bsodUntil = s.elapsed + 1.1; Sound.play('crash'); E.log('A fatal exception 0E has occurred (just kidding). Cool your CPU!', 'bad'); break;
      case 'cashback': { const amt = randi(100, 250); E.money(amt, `Your bank reversed a fraudulent charge: +${fmtMoney(amt)}.`); E.toast('Bank Alert', `Refund received: ${fmtMoney(amt)}. A rare win.`, 'DollarSign', 'good'); break; }
      default: break;
    }
  };

  /* multiplayer effects */
  E.applySabotage = (kind, from) => {
    const s = S(); if (s.phase !== 'playing') return; const def = SABOTAGES[kind]; if (!def) return;
    s.sabReceived++;
    s.banner = { title: 'SABOTAGE!', sub: `${from} sent ${def.name}`, until: s.elapsed + 2.2, tone: 'surge' };
    E.log(`💀 ${from} hit you with ${def.name}!`, 'bad'); Sound.play('alarm');
    switch (kind) {
      case 'kevin': E.spawnScam('tech'); break;
      case 'storm': for (let i = 0; i < 3; i++) E.spawnScam('prize'); break;
      case 'bsod': s.bsodUntil = s.elapsed + 2.5; Sound.play('crash'); break;
      case 'heat': E.heat(10); s.fanBrokenUntil = s.elapsed + 8; break;
      case 'shill': E.spawnScam(E.allowed('crypto') ? 'crypto' : 'download'); break;
      case 'flip': s.flipUntil = s.elapsed + 7; break;
      case 'fakewarn':
        s.fakeHudUntil = s.elapsed + 5;
        s.toasts.push({ id: s.uid++, title: 'CRITICAL', body: 'CPU at 99°C!!! Shut down immediately!!!', icon: 'Flame', tone: 'bad', until: s.elapsed + 5 });
        s.toasts.push({ id: s.uid++, title: 'Bank alert', body: 'Pending withdrawal: −$4,999.', icon: 'Wallet', tone: 'bad', until: s.elapsed + 5 });
        s.toasts.push({ id: s.uid++, title: 'Security Center', body: 'A virus was detected in your mouse.', icon: 'Bug', tone: 'bad', until: s.elapsed + 5 });
        break;
      default: break;
    }
  };
  E.applyAssist = (kind, from) => {
    const s = S(); if (s.phase !== 'playing' || kind !== 'sweep') return;
    const target = s.windows.filter((w) => !w.closing && SCAM_KINDS.has(w.kind)).sort((a, b) => a.born - b.born)[0];
    s.helpers++;
    if (!target) { E.toast('Teamwork', `${from} tried to sweep your desktop, but it was already clean.`, 'Sparkles', 'good'); return; }
    E.log(`🧹 ${from} swept away “${target.title}” for you!`, 'good');
    E.toast('Teamwork', `${from} swept away a scam for you!`, 'Sparkles', 'good');
    if (target.kind === 'app') E.closeApp(target); else { E.remove(target.id); Sound.play('good'); }
  };
  E.applyGlobal = (kind) => {
    const s = S(); if (s.phase !== 'playing') return; const def = GLOBAL_EVENTS[kind]; if (!def) return;
    s.banner = { title: 'GLOBAL EVENT', sub: def.name, until: s.elapsed + 2.6, tone: def.good ? 'global good' : 'global' };
    E.log(`🌐 GLOBAL EVENT: ${def.name}. ${def.desc}`, def.good ? 'good' : 'wave');
    Sound.play(def.good ? 'good' : 'alarm');
    const coop = !!hooks.coop; /* in co-op the server applies bank/CPU changes once for the whole team */
    switch (kind) {
      case 'heatwave': if (!coop) E.heat(10); s.fanWeakUntil = s.elapsed + 15; break;
      case 'callcenter': E.spawnScam('tech'); break;
      case 'frenzy': E.spawnScam(E.allowed('crypto') ? 'crypto' : 'download'); break;
      case 'update': s.updateUntil = s.elapsed + 5; break;
      case 'surge':
        s.windows.forEach((w) => { if (!w.closing) { w.x = randi(4, Math.max(4, Math.round(s.bounds.w - w.w - 4))); w.y = randi(4, Math.max(4, Math.round(s.bounds.h - w.h - 4))); } });
        s.chaos = Math.min(100, s.chaos + 25); s.shakeUntil = s.elapsed + 0.7; break;
      case 'glitch': if (!coop) E.money(300, 'Bank Glitch: +$300 appeared in your account.'); break;
      case 'breeze': if (!coop) E.heat(-15); break;
      default: break;
    }
  };
  E.snapshot = () => {
    const s = S();
    const info = (w) => {
      const d = w.data;
      switch (w.kind) {
        case 'download': return `Auto-install in ${Math.max(0, Math.ceil(d.timer))}s — ${d.buttons.filter((b) => b.gone).length} wrong clicks`;
        case 'tech': return `Kevin is billing $${Math.round(Math.min(32, d.base + d.age * 0.5))}/sec — X dodged ${d.dodges} times`;
        case 'crypto': return d.crashed ? 'RUG PULLED' : `${d.coin} $${fmtPrice(d.price)} — holding ${fmtMoney(d.holdings * d.price)}`;
        case 'antivirus': return `Auto-renews in ${Math.max(0, Math.ceil(d.timer))}s (${fmtMoney(d.charge)})`;
        case 'prize': return `“Claim your free iPod!” ${Math.max(0, Math.ceil(d.timer))}s`;
        case 'app': return APP_BY_ID[d.app].proc + ' is eating the CPU';
        default: return '';
      }
    };
    return {
      t: Math.round(s.elapsed), money: Math.round(s.money), cpu: Math.round(s.cpu), chaos: Math.round(s.chaos), defeated: s.defeated, wave: s.wave,
      bw: Math.round(s.bounds.w), bh: Math.round(s.bounds.h), flip: s.flipUntil > s.elapsed, bsod: s.bsodUntil > s.elapsed, update: s.updateUntil > s.elapsed,
      ws: s.windows.filter((w) => !w.closing && !w.minimized).slice(-14).map((w) => ({ id: w.id, k: w.kind, ti: w.title.slice(0, 48), x: Math.round(w.x), y: Math.round(w.y), w: Math.round(w.w), h: Math.round(w.h), z: w.z, i: info(w), ic: titleIcon(w) })),
      log: s.log.slice(-4).map((l) => ({ m: l.msg.slice(0, 120), k: l.kind })),
    };
  };

  /* main tick */
  E.tick = (dt) => {
    const s = S(); if (s.phase !== 'playing' || s.paused) return;
    if (hooks.clock) { const t = hooks.clock(); if (t < 0) return; s.elapsed = Math.min(GAME_LEN, Math.max(s.elapsed, t)); } else s.elapsed += dt;
    const d = E.diff(), hs = hooks.coop ? 1 / Math.max(1, hooks.n || 1) : 1;
    while (s.elapsed >= s.nextWave && s.nextWave < GAME_LEN) { E.wave(); s.nextWave += WAVE_EVERY; }
    if (s.overload && s.overload.remaining > 0) {
      s.overload.next -= dt;
      if (s.overload.next <= 0) { E.spawnApp(s.overload.group); s.overload.remaining--; s.overload.next = rand(0.7, 1.4) - 0.3 * d; }
    }
    let heat = 0;
    for (const w of s.windows.slice()) {
      const h0 = heat;
      if (w.closing) continue; const dd = w.data;
      switch (w.kind) {
        case 'download':
          heat += 0.3; dd.timer -= dt;
          if (dd.timer <= 0) { E.remove(w.id); const loss = Math.round(450 + 250 * d); E.money(-loss, `Auto-download finished: malware installed. −${fmtMoney(loss)}`, w); E.heat(12, w); Sound.play('crash'); }
          break;
        case 'tech': {
          heat += 0.35; dd.age += dt;
          const rate = Math.min(32, dd.base + dd.age * 0.5);
          E.money(-rate * dt, null, w, { silent: true, quiet: true });
          dd.billAcc += rate * dt; if (dd.billAcc >= 100) { dd.billAcc -= 100; E.floater('−$100', '#ff4f7b', w); }
          if (dd.age >= dd.nextMsg && dd.line < dd.script.length) { dd.msgs.push(dd.script[dd.line++]); dd.nextMsg = dd.age + rand(3.2, 4.6); }
          break;
        }
        case 'crypto':
          heat += 0.5; dd.age += dt; dd.acc += dt;
          while (dd.acc >= 0.35) { dd.acc -= 0.35; E.cryptoStep(w); }
          if (!dd.crashed && !dd.warned && dd.age >= dd.crashAt - dd.warnLead) { dd.warned = true; dd.news.unshift(pick(WARN)); dd.news = dd.news.slice(0, 3); }
          if (!dd.crashed && dd.age >= dd.crashAt) E.cryptoCrash(w);
          if (dd.crashed) { dd.post += dt; if (dd.post >= 6) E.finishCrypto(w); }
          break;
        case 'antivirus':
          heat += 0.3; dd.scan += dt; dd.timer -= dt;
          if (dd.timer <= 0) { dd.timer = dd.renew; E.money(-dd.charge, `Defender auto-renewed your subscription: −${fmtMoney(dd.charge)}.`, w); E.shake(w); }
          break;
        case 'app': heat += 0.5; break;
        case 'prize':
          dd.timer -= dt; if (dd.timer <= 0) { E.remove(w.id); E.log('Prize offer expired. Phew.', 'info'); }
          break;
        default: break;
      }
      if (heat > h0) s.heatBy[w.kind] = (s.heatBy[w.kind] || 0) + (heat - h0) * dt;
    }
    s.cpu += heat * dt * (1 + 0.3 * d) * hs;
    s.fanSpin = Math.max(0, s.fanSpin - dt * 2.2);
    s.cpu = Math.max(32, s.cpu - (0.45 + s.fanSpin * 0.08) * dt * hs);
    s.feed = s.feed.filter((f) => f.until > s.elapsed);
    s.emotes = s.emotes.filter((f) => f.until > s.elapsed);
    s.maxCpu = Math.max(s.maxCpu, s.cpu);
    if (s.explorerDown > 0) s.explorerDown = Math.max(0, s.explorerDown - dt);

    const open = s.windows.filter((w) => !w.closing && SCAM_KINDS.has(w.kind)).length;
    const target = clamp(open * 12 + d * 30 + Math.max(0, s.cpu - 50) * 0.6, 0, 100);
    s.chaos += (target - s.chaos) * Math.min(1, dt * 0.7);
    if (s.chaos >= 90 && s.elapsed - s.lastSurge > 25 && s.elapsed < GAME_LEN - 5) E.surge();
    s.nuisanceIn -= dt * (0.6 + s.chaos / 60);
    if (s.nuisanceIn <= 0) { s.nuisanceIn = rand(9, 15); E.nuisance(); }

    s.floaters = s.floaters.filter((f) => f.until > s.elapsed);
    s.toasts = s.toasts.filter((t) => t.until > s.elapsed);
    if (s.cpu >= 85 && !s.hotWarned) { s.hotWarned = true; E.toast('Thermal warning', 'CPU at 85°C! Close windows or spin the fan.', 'Flame', 'bad'); Sound.play('alarm'); }
    if (s.cpu < 75) s.hotWarned = false;
    if (s.money < 1000 && !s.poorWarned) { s.poorWarned = true; E.toast('Bank alert', 'Balance under $1,000. Stop feeding the scammers!', 'Wallet', 'bad'); Sound.play('alarm'); }

    if (!hooks.coop) {
      if (s.money <= 0) { s.money = 0; E.end(false, 'bankrupt'); return; }
      if (s.cpu >= 100) { s.cpu = 100; E.end(false, 'meltdown'); return; }
    }
    if (s.elapsed >= GAME_LEN) { s.elapsed = GAME_LEN; E.end(true, 'survived'); }
  };

  E.end = (won, reason) => {
    const s = S(); if (s.phase !== 'playing') return;
    s.phase = won ? 'won' : 'lost'; s.endReason = reason; s.startOpen = false; s.paused = false; s.showHelp = false; s.confirmQuit = false;
    Sound.play(won ? 'win' : 'lose');
    E.log(won ? 'You survived 3 minutes of pure scam. Legendary.' : reason === 'bankrupt' ? 'Bank balance hit $0. The scammers thank you.' : reason === 'meltdown' ? 'CPU hit 100°C. Your PC is now a toaster.' : 'Run ended early.', won ? 'good' : 'bad');
    rerender();
    const result = buildResult(s);
    if (hooks.onEndNow) hooks.onEndNow(result);
    setTimeout(() => { if (endRef.current) endRef.current(result); }, 2600);
  };
  return E;
}
