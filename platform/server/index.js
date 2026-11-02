/* oddball platform server.
 * One Node process serves every game's built pages (dist/) and routes each game's
 * WebSocket traffic to that game's own server module at /ws/<game-id>.
 * To add a multiplayer game: create games/<id>/server and register it in ./registry.js. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_SERVERS, PAGES } from './registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', '..', 'dist');
const PORT = Number(process.env.PORT) || 8787;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

function sendFile(res, file, status = 200) {
  fs.readFile(file, (e, buf) => {
    if (e) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('Site not built yet. Run "npm run build", then "npm start".'); return; }
    const ext = path.extname(file);
    res.writeHead(status, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(buf);
  });
}
const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); res.end(); return; }
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, games: Object.fromEntries(Object.entries(GAME_SERVERS).map(([id, g]) => [id, g.stats()])) }));
    return;
  }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
  // /deadline-day -> /deadline-day/ so relative links behave
  const top = rel.split('/')[1];
  if (PAGES.includes(top) && rel === `/${top}`) { res.writeHead(301, { location: `/${top}/${url.search}` }); res.end(); return; }
  let file = path.resolve(DIST, '.' + rel);
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    else if (!err && st.isFile()) { sendFile(res, file); return; }
    fs.stat(file, (err2, st2) => {
      if (!err2 && st2.isFile()) { sendFile(res, file); return; }
      // unknown path inside a game -> that game's page; anything else -> the hub
      if (PAGES.includes(top)) sendFile(res, path.join(DIST, top, 'index.html'));
      else sendFile(res, path.join(DIST, 'index.html'), rel === '/' ? 200 : 404);
    });
  });
});

server.on('upgrade', (req, socket, head) => {
  let p = '';
  try { p = new URL(req.url, 'http://localhost').pathname; } catch { /* ignore */ }
  const id = p === '/ws' ? 'anti-scam' : p.startsWith('/ws/') ? p.slice(4) : null; // bare /ws kept for older Anti-Scam links
  const game = id && GAME_SERVERS[id];
  if (!game) { socket.destroy(); return; }
  game.wss.handleUpgrade(req, socket, head, (ws) => game.wss.emit('connection', ws, req));
});

server.listen(PORT, () => {
  console.log(`oddball running on http://localhost:${PORT}`);
  console.log(`  games: ${Object.keys(GAME_SERVERS).map((id) => `/ws/${id}`).join(', ')}`);
  if (!fs.existsSync(path.join(DIST, 'index.html'))) console.log('  note: dist/ not found. Run "npm run build" to serve the site, or use "npm run dev".');
});
