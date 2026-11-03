# Deadline Day player photos

- Added 243 local PNG headshots: complete coverage of the existing real-player pool.
- `public/photos/index.json` maps the existing player IDs to bundled files; the existing `npm run photos` and build commands regenerate it.
- `public/photos/sources.json` records the original image and player-profile URLs; `credits.txt` is accessible from the landing screen’s Photo credits button.
- Updated the shared `Portrait` component so cards, pitch tokens and signing lists use the same photos. A failed image falls back to the existing silhouette without affecting the next player when that component is reused.
- Cards preserve photo proportions, keep space for rating/nation badges, and fade the lower edge into the card. Circular tokens retain a tighter head crop. Small card names wrap and their metadata inherits the card font size.
- Original gameplay, roster data, ratings, transfers and multiplayer code are unchanged. Generated academy players still use silhouettes.

## Validation

Production build passed. All 243 PNGs were decoded and checked for unique file content. Browser checks covered all 243 image loads, desktop/mobile landing layouts, mobile horizontal overflow, photo credits, academy fallback, and switching to a valid player after a failed photo.

## Run

```sh
npm install
npm run dev
```

For production, use the existing `npm run build` and `npm start` commands.
No runtime photo API key or external image host is needed.
