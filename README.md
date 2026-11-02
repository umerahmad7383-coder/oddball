# oddball

Strange little browser games, most of them better with friends.

| Game | Path | Players |
|---|---|---|
| **Deadline Day**: live football transfer auction | `/deadline-day/` | 2–8 online |
| **The Perfectly Normal Form**: one form, ever-stranger rules | `/normal-form/` | Solo |
| **Tiny Nation**: build a country in ten years | `/tiny-nation/` | Solo |
| **Anti-Scam Arcade**: survive 3 minutes on a cursed desktop | `/anti-scam/` | Solo, same-device duel, or 2–4 online |

The home page at `/` lists every game.

## Run it

You need Node.js 18.18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 (the game server runs on :8787)
```

To test multiplayer on one computer, open two browser tabs. Each tab is a separate player.

To run the production build:

```bash
npm run build && npm start   # http://localhost:8787
```

## Deploy (Render, free)

1. Push this folder to a GitHub repo, with `package.json` at the top level.
2. In Render, choose **New → Web Service** and pick the repo. Use these settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Instance type:** Free
   - **Health check path:** `/healthz` (optional)
3. Share the `https://….onrender.com` address.

A custom domain such as `oddball.fun` can be added under **Settings → Custom Domains** in Render.

Docker also works:

```bash
docker build -t oddball .
docker run -p 8787:8787 oddball
```

## Deadline Day rules

- 2–8 managers. Each has £500M.
- **Classic** squads have 11 players. **Quick** squads have 7.
- Footballers come up in random order. Each lot runs **20s**, and a bid in the last 5s resets the clock to **8s**.
- Bid steps grow with the price: £1M under £20M, £2M under £50M, £5M under £100M, then £10M.
- You can't bid more than your budget minus **£5M for every other empty slot**, so you can always finish your squad.
- **Pass** if you don't want a player. When everyone else has passed, the hammer drops early.
- If a manager ignores three lots in a row, they auto-pass until they act again, so nobody can stall the auction.
- Unsold players return at half price once the pool runs out. Squads still incomplete at the end are topped up with 58–62 rated academy players.
- **Tactics phase:** after the auction, everyone picks a formation and arranges their squad on the pitch.
- **Out of position:** a footballer loses rating outside his position: −3 for a similar position, −7 for the same line, −15 for a different line, and −40 for a goalkeeper swap.
- **Chemistry:** each player scores 0–10. Up to 4 points come from playing in position. Up to 6 come from links to neighbouring teammates: same club is worth 3, same nation 2, same league 1.
- **Final score** = average effective rating × 0.85 + chemistry % × 0.15. Remaining money breaks ties.

The footballer list is in `games/deadline-day/shared/players.js`. It's a mid-2026 snapshot with this game's own ratings, one row per player, so it's easy to update.

### Player photos

Cards show a club-coloured silhouette until you add photos.

1. Get photos you're allowed to use. Wikimedia Commons (commons.wikimedia.org) has free-licence photos of most famous players.
2. Name each file after the player, exactly as the game spells them, e.g. `Erling Haaland.jpg` or `Kylian Mbappé.png`. Accents are optional.
3. Upload them into `public/photos/` in your GitHub repo.
4. If the licence asks for credit, which Commons photos usually do, add one line per photo to `public/photos/credits.txt`. A "Photo credits" link then appears on the Deadline Day page.

Render rebuilds automatically, and the build matches each photo to its player. The Render build log lists any file names that didn't match a player. Full details are in `public/photos/README.txt`.

## How the site is built

```
index.html, anti-scam/index.html, deadline-day/index.html   one page per game (separate code and styles)
platform/
  games.js            the catalogue the home page shows
  hub/                the home page
  client/net.js       shared WebSocket client (reconnects, resumes after reload, clock sync)
  client/useRoom.js   shared React hook for rooms (create/join, lobby, invite links)
  server/index.js     serves every page and routes /ws/<game-id> to that game's server
  server/rooms.js     shared room system (codes, names, host, ready-up, reconnects, rematches)
  server/registry.js  which multiplayer game servers exist
games/
  deadline-day/{shared,server,client}
  anti-scam/{shared,server,client}
```

**Games are isolated.** Each game keeps its rules, data and state inside its own folder, loads on its own page, and has its own WebSocket endpoint.

**What the server controls.** It owns every price, timer, budget and squad. Simultaneous bids are handled in arrival order, and a bid that arrives a moment too late is rejected with "someone beat you to it".

**Reconnects.** A player who reloads or drops comes straight back to the same seat.

### Adding a new game

1. Create `games/<slug>/` with `client/main.jsx`, plus `shared/` and `server/` if it's multiplayer. Call `initCosmetics()` in `main.jsx` so cursor trails work.
2. Add `<slug>/index.html` that loads `/games/<slug>/client/main.jsx`.
3. Add the page to `pages` in `vite.config.js` and to `PAGES` in `platform/server/registry.js`.
4. Add an entry to `platform/games.js`, then give it tile art in `platform/hub/Hub.jsx`.
5. For multiplayer:
   - Build the server with `createRoomHub()` from `platform/server/rooms.js`.
   - Register it in `platform/server/registry.js`, adding the slug to `PAGES`.
   - Use `useRoom('<slug>')` on the client.

Later, shared accounts, profiles and site-wide leaderboards can be added in `platform/` without touching existing games.

## Making money

Everything is configured in `platform/site.config.js`. Each feature stays hidden until you fill it in, so the site never shows empty or broken slots.

The games themselves stay ad-free. Money features live only on the home page: the top bar, the side **Dev panel** and the footer.

| Feature | Where it shows | What to fill in |
|---|---|---|
| Carbon Ads (one small text + image ad) | footer, bottom-left | `MONEY.carbon.serve` and `placement` from your Carbon Ads account |
| Tip goal bar ("Server costs this month") | footer, bottom-right | `MONEY.kofiUrl`, plus `tipGoal.raised` and `goal`. Update `raised` by hand when tips come in. |
| Shop: site themes and cursor trails | Shop button, top-right | `MONEY.kofiUrl` (where people buy) and `MONEY.supporterCodeHashes` |
| Sandbox tile for Patreon supporters | end of the games grid | `MONEY.patreonUrl` |
| Asset packs | Sandbox screen and Dev panel | `MONEY.assetStoreUrl` |
| "Built with…" list with optional affiliate links | footer link and Dev panel | `BUILT_WITH`. Set `affiliate: true` on affiliate links and the site labels them. |
| "Advertise / Sponsor a game" link | top-left | `SITE.contactEmail` |
| Dev log | Dev panel | `DEV_LOG` |

**Supporter codes.** Run `npm run make-code -- SOMECODE` and paste the printed hash into `supporterCodeHashes`. Then sell `SOMECODE` as a Ko-fi shop item. Anyone who enters it unlocks every theme and trail in their browser. The check runs in the browser, so treat it as an honour system; that's fine for cosmetics.

**Sponsorships.** These are handled by hand: agree a deal, then change one game's art for the agreed period.

**Licensing games.** Each game lives in its own `games/<id>/` folder, so you can hand a single game to a portal without the rest of the site.

**Not built: the "share idle connection resources" SDK.** These SDKs turn visitors' browsers into a proxy network that other companies route traffic through. Visitors' connections can end up carrying traffic they'd never agree to. These SDKs can also break your host's rules and get the domain flagged by security tools. That's a lot of risk for a site whose appeal is that it feels clean.

## Notes

- Rooms live in memory. Redeploying closes open rooms, so run a single server instance.
- `DD_TIME_SCALE=0.1 npm start` speeds Deadline Day's timers up for testing. Don't set it in production.
- On Render's free plan, the server sleeps after about 15 idle minutes. The first visit afterwards takes up to a minute.
