/* Builds public/photos/index.json from whatever images are in public/photos/.
 * Name each file after the footballer, e.g. "Erling Haaland.jpg" or "erling-haaland.webp".
 * Runs automatically before every build. */
import fs from 'node:fs';
import path from 'node:path';
import { FOOTBALLERS, slugify } from '../games/deadline-day/shared/players.js';

const DIR = path.resolve('public/photos');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
fs.mkdirSync(DIR, { recursive: true });
const ids = new Set(FOOTBALLERS.map((f) => f.id));
const files = {}, unmatched = [];
for (const name of fs.readdirSync(DIR)) {
  const ext = path.extname(name).toLowerCase();
  if (!EXT.has(ext)) continue;
  const id = slugify(path.basename(name, path.extname(name)));
  if (ids.has(id)) files[id] = name; else unmatched.push(name);
}
const credits = fs.existsSync(path.join(DIR, 'credits.txt'));
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({ files, credits }, null, 0));
console.log(`photos: ${Object.keys(files).length} matched${unmatched.length ? `, ${unmatched.length} not matched to a player: ${unmatched.join(', ')}` : ''}`);
