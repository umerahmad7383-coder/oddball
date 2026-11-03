/* Talks to the oddball API. The x-oddball header is required for every change (CSRF protection). */
export async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') { opts.headers['x-oddball'] = '1'; opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body || {}); }
  let r;
  try { r = await fetch(path, opts); } catch (e) { const err = new Error('Can’t reach oddball. Check your connection.'); err.status = 0; throw err; }
  let j = null; try { j = await r.json(); } catch (e) { /* empty */ }
  if (!r.ok) { const err = new Error((j && j.error) || `Something went wrong (${r.status}).`); err.status = r.status; throw err; }
  return j;
}
/** Record a finished game for signed-in players. Silently does nothing for visitors. */
export function recordPlay(game, data = {}) {
  if (previewMode()) return;
  fetch('/api/stats/play', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json', 'x-oddball': '1' }, body: JSON.stringify({ game, ...data }) }).catch(() => {});
}
/** Anonymous page counter: no cookies, no ids. */
export function track(page) {
  if (previewMode()) return;
  fetch('/api/track', { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'content-type': 'application/json', 'x-oddball': '1' }, body: JSON.stringify({ page }) }).catch(() => {});
}
export function previewMode() {
  try { const p = new URLSearchParams(window.location.search).get('promo'); return p === 'preview' || p === 'off' ? p : null; } catch (e) { return null; }
}
