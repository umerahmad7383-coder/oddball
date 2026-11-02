/* oddball cosmetics: purely visual, never pay-to-win.
 * Themes restyle the home page; cursor trails follow the pointer on every page that calls initCosmetics(). */
const KEY = 'oddball.cosmetics';
export const THEMES = {
  midnight: { name: 'Midnight', free: true, swatch: ['#0f0c1a', '#ff5a36', '#ffd400'] },
  paper: { name: 'Paper', free: true, swatch: ['#f4f5fa', '#15131a', '#ff5a36'] },
  cyberpunk: { name: 'Cyberpunk', swatch: ['#0a0014', '#ff2bd6', '#00fff0'] },
  terminal: { name: 'Retro Terminal', swatch: ['#000', '#33ff66', '#1a7a33'] },
  oled: { name: 'True OLED Black', swatch: ['#000', '#fff', '#333'] },
};
export const TRAILS = {
  none: { name: 'No trail', free: true },
  sparkle: { name: 'Sparkles' },
  comet: { name: 'Comet' },
  confetti: { name: 'Confetti' },
};

export function getCosmetics() {
  try { return { theme: 'midnight', trail: 'none', supporter: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { return { theme: 'midnight', trail: 'none', supporter: false }; }
}
export function setCosmetics(patch) {
  const next = { ...getCosmetics(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  apply(next);
  window.dispatchEvent(new CustomEvent('oddball-cosmetics', { detail: next }));
  return next;
}
export const canUse = (c, kind, id) => (kind === 'theme' ? THEMES : TRAILS)[id]?.free || c.supporter;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** Check a supporter code against the hashes in site.config.js. */
export async function redeem(code, hashes) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean || !hashes || !hashes.length || !window.crypto?.subtle) return false;
  const h = await sha256(clean);
  if (!hashes.includes(h)) return false;
  setCosmetics({ supporter: true });
  return true;
}

function apply(c) {
  document.documentElement.dataset.theme = canUse(c, 'theme', c.theme) ? c.theme : 'midnight';
  trail.mode = canUse(c, 'trail', c.trail) ? c.trail : 'none';
}

/* ---------- cursor trail (canvas overlay, ignores clicks) ---------- */
const trail = { mode: 'none', canvas: null, ctx: null, parts: [], raf: 0, last: null };
function frame() {
  const { ctx, canvas, parts } = trail;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= 1; p.x += p.vx; p.y += p.vy; p.vy += p.g;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    const a = p.life / p.max; ctx.globalAlpha = a; ctx.fillStyle = p.c;
    if (p.kind === 'star') { ctx.beginPath(); for (let k = 0; k < 5; k++) { const ang = (k * 4 * Math.PI) / 5 - Math.PI / 2, r = p.r * (0.6 + a * 0.4); ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r); } ctx.fill(); }
    else if (p.kind === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot += 0.2); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  trail.raf = parts.length ? requestAnimationFrame(frame) : 0;
}
function emit(x, y) {
  const m = trail.mode; if (m === 'none') return;
  const n = m === 'comet' ? 2 : 1;
  for (let i = 0; i < n; i++) {
    if (m === 'sparkle') trail.parts.push({ kind: 'star', x, y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, g: 0.02, r: 4 + Math.random() * 3, life: 30, max: 30, c: ['#ffd400', '#fff', '#ff9bf0'][Math.floor(Math.random() * 3)] });
    if (m === 'comet') trail.parts.push({ kind: 'dot', x, y, vx: 0, vy: 0, g: 0, r: 7, life: 22, max: 22, c: `hsl(${(Date.now() / 6) % 360} 95% 65%)` });
    if (m === 'confetti') trail.parts.push({ kind: 'rect', x, y, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, g: 0.15, r: 4, rot: Math.random() * 6, life: 45, max: 45, c: ['#ff5a36', '#2f6bff', '#16a34a', '#ffd400', '#d946ef'][Math.floor(Math.random() * 5)] });
  }
  if (trail.parts.length > 220) trail.parts.splice(0, trail.parts.length - 220);
  if (!trail.raf) trail.raf = requestAnimationFrame(frame);
}
let started = false;
export function initCosmetics() {
  apply(getCosmetics());
  if (started) return; started = true;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2147483000' });
  document.body.appendChild(c);
  const size = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
  size(); window.addEventListener('resize', size);
  trail.canvas = c; trail.ctx = c.getContext('2d');
  window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') emit(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('storage', (e) => { if (e.key === KEY) apply(getCosmetics()); });
}
