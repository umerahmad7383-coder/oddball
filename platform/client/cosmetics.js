/* oddball cosmetics: looks only, never gameplay.
 * What you can use is decided by the server (/api/me). Visitors get the default look.
 * Admin previews can force a theme with ?theme=… */
export const THEME_IDS = ['paper', 'midnight', 'terminal', 'retro', 'notebook', 'neon', 'mono', 'gold'];

const trail = { mode: 'none', canvas: null, ctx: null, parts: [], raf: 0 };
function frame() {
  const { ctx, canvas, parts } = trail;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= 1; p.x += p.vx; p.y += p.vy; p.vy += p.g;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    const a = p.life / p.max; ctx.globalAlpha = a; ctx.fillStyle = p.c;
    if (p.kind === 'star') { ctx.beginPath(); for (let k = 0; k < 5; k++) { const ang = (k * 4 * Math.PI) / 5 - Math.PI / 2, r = p.r * (0.6 + a * 0.4); ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r); } ctx.fill(); }
    else if (p.kind === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot += 0.2)); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.kind === 'snow' ? 1 : a), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  trail.raf = parts.length ? requestAnimationFrame(frame) : 0;
}
function emit(x, y) {
  const m = trail.mode; if (m === 'none' || !trail.ctx) return;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  if (m === 'sparkle') trail.parts.push({ kind: 'star', x, y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, g: 0.02, r: 4 + Math.random() * 3, life: 30, max: 30, c: pick(['#ffd400', '#fff', '#ff9bf0']) });
  if (m === 'comet') for (let i = 0; i < 2; i++) trail.parts.push({ kind: 'dot', x, y, vx: 0, vy: 0, g: 0, r: 7, life: 22, max: 22, c: `hsl(${(Date.now() / 6) % 360} 95% 65%)` });
  if (m === 'confetti') trail.parts.push({ kind: 'rect', x, y, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, g: 0.15, r: 4, rot: Math.random() * 6, life: 45, max: 45, c: pick(['#ff5a36', '#2f6bff', '#16a34a', '#ffd400', '#d946ef']) });
  if (m === 'snow') trail.parts.push({ kind: 'snow', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 0.6, vy: 0.6 + Math.random(), g: 0, r: 2 + Math.random() * 2, life: 60, max: 60, c: '#dbeafe' });
  if (trail.parts.length > 220) trail.parts.splice(0, trail.parts.length - 220);
  if (!trail.raf) trail.raf = requestAnimationFrame(frame);
}
let started = false;
function startTrailCanvas() {
  if (started || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  started = true;
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2147483000' });
  document.body.appendChild(c);
  const size = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
  size(); window.addEventListener('resize', size);
  trail.canvas = c; trail.ctx = c.getContext('2d');
  window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') emit(e.clientX, e.clientY); }, { passive: true });
}

/** Apply a theme/trail the server says this user may use. */
export function applyCosmetics({ theme, trail: t } = {}, { themes = true } = {}) {
  const forced = new URLSearchParams(window.location.search).get('theme');
  if (themes) document.documentElement.dataset.theme = THEME_IDS.includes(forced) ? forced : THEME_IDS.includes(theme) ? theme : 'paper';
  trail.mode = ['sparkle', 'comet', 'confetti', 'snow'].includes(t) ? t : 'none';
  if (trail.mode !== 'none') startTrailCanvas();
}
/** Fetch the signed-in user's equipped (server-validated) cosmetics. `themes: false` for games with their own look. */
export async function initCosmetics({ themes = true } = {}) {
  applyCosmetics({}, { themes });
  try {
    const r = await fetch('/api/me', { credentials: 'same-origin' });
    if (!r.ok) return null;
    const me = await r.json();
    const eff = me && me.profile ? me.profile.effective : {};
    applyCosmetics({ theme: eff.theme && eff.theme.data.theme, trail: eff.trail && eff.trail.data.trail }, { themes });
    return me;
  } catch (e) { return null; }
}
