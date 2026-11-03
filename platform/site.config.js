/* oddball site settings that rarely change. Everything money-related is managed at /admin. */
export const SITE = {
  name: 'oddball',
  tagline: 'Strange little games. Pick one.',
  contactEmail: '',            // e.g. 'hello@oddball.fun' → shows "Advertise / Sponsor a game" (top-left)
};

/* Money settings (ads, Ko-fi, memberships) now live in the admin dashboard at /admin. */

/* "Built with…" panel. Mark affiliate links honestly (the site labels them for you). */
export const BUILT_WITH = [
  { name: 'React', what: 'UI for every game', url: 'https://react.dev' },
  { name: 'Vite', what: 'build tool', url: 'https://vitejs.dev' },
  { name: 'Tailwind CSS', what: 'layout utilities', url: 'https://tailwindcss.com' },
  { name: 'Lucide', what: 'icons', url: 'https://lucide.dev' },
  { name: 'Node.js + ws', what: 'multiplayer server', url: 'https://github.com/websockets/ws' },
  { name: 'Render', what: 'hosting', url: 'https://render.com', affiliate: false },
];

/* Dev log shown in the side panel, newest first. */
export const DEV_LOG = [
  { date: '3 Nov 2026', text: 'Cleaned up the home page. Fewer boxes, more games.' },
  { date: '2 Nov 2026', text: 'Two new games: Tiny Nation and The Perfectly Normal Form (good luck).' },
  { date: '2 Nov 2026', text: 'Deadline Day: new TV-studio look, auto-bidding, “where he’d play” previews, drag-and-drop XI, smarter lots, summer 2026 transfers.' },
  { date: '1 Nov 2026', text: 'Deadline Day launched: live football transfer auctions for 2–8 managers.' },
  { date: '1 Nov 2026', text: 'oddball opened with Anti-Scam Arcade.' },
];
