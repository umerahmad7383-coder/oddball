PLAYER PHOTOS FOR DEADLINE DAY
==============================

243 bundled local PNG headshots, matched to the existing real-player pool.
No external image service or API key is needed while playing.
Generated academy players intentionally keep their club-colour silhouette.

Cards preserve the image proportions and leave space above the face for the
rating and nation badge. Pitch tokens and signing lists use a tighter circle.
Source and profile links are recorded in sources.json and credits.txt.
The existing Photo credits button opens the credits from the landing screen.

To replace a photo:
1. Replace its player-slug.png file in this folder, or remove that PNG before
   adding a different format so only one image exists for that player.
2. Use a transparent, tightly framed headshot with hair at the top and neck
   or shoulders at the bottom. The bundled images provide framing examples.
3. Run npm run photos, or build normally with npm run build.
4. Keep the source/credit entries up to date for any replacements.

Accepted image extensions: .jpg .jpeg .png .webp .avif .gif.
Files may use the exact player name or the slug from shared/players.js.
Missing or broken photos gracefully fall back to the existing silhouette.
