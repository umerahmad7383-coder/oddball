/* The oddball catalogue, in display order.
 * Add a game: create games/<slug>/, a page at <slug>/index.html, an entry here, and art in hub/Hub.jsx.
 * `released` drives the "new" label, so nothing stays "new" forever. */
export { SITE } from './site.config.js';

export const GAMES = [
  { slug: 'macro-micro', href: '/macro-micro/', title: 'Macro / Micro', blurb: 'A photo, zoomed in until it makes no sense. Zoom out until you know what it is.', players: 'Solo', art: 'macro', released: '2026-11-05' },
  { slug: 'deadline-day', href: '/deadline-day/', title: 'Deadline Day', blurb: 'Bid against your friends for real footballers. The best squad wins.', players: '2–8 players, online', art: 'deadline', released: '2026-11-01' },
  { slug: 'normal-form', href: '/normal-form/', title: 'The Perfectly Normal Form', blurb: 'It’s just a form. The rules keep changing.', players: 'Solo', art: 'form', released: '2026-11-02' },
  { slug: 'tiny-nation', href: '/tiny-nation/', title: 'Tiny Nation', blurb: 'You get an island and ten years. Every choice comes back later.', players: 'Solo', art: 'nation', released: '2026-11-02' },
  { slug: 'anti-scam', href: '/anti-scam/', title: 'Anti-Scam Arcade', blurb: 'Survive three minutes on the worst computer ever made.', players: 'Solo, or 2–4 online', art: 'antiscam', released: '2026-11-01' },
];
const NEW_FOR_DAYS = 21;
export const isNew = (g, now = Date.now()) => !!g.released && now - new Date(g.released).getTime() < NEW_FOR_DAYS * 86400_000;
