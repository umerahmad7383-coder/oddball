/* The oddball catalogue. The home page shows one tile per entry, in this order.
 * Add a game: create games/<slug>/, a page at <slug>/index.html, and an entry here. */
export { SITE } from './site.config.js';

export const GAMES = [
  { slug: 'deadline-day', href: '/deadline-day/', title: 'Deadline Day', blurb: 'Live football transfer auction. £500M, real players, your mates bidding against you.', players: '2–8 online', art: 'deadline', color: '#ffe14d', tag: 'Multiplayer' },
  { slug: 'normal-form', href: '/normal-form/', title: 'The Perfectly Normal Form', blurb: 'Fill in one simple form. The rules get a little stranger every time you’re close.', players: 'Solo', art: 'form', color: '#ff5a36', tag: 'New', isNew: true },
  { slug: 'tiny-nation', href: '/tiny-nation/', title: 'Tiny Nation', blurb: 'An empty island, ten turns and a small budget. Build a country and see what it becomes.', players: 'Solo', art: 'nation', color: '#2ee59d', tag: 'New', isNew: true },
  { slug: 'anti-scam', href: '/anti-scam/', title: 'Anti-Scam Arcade', blurb: 'Survive three minutes on a cursed 2004 desktop full of pop-ups and scammers.', players: 'Solo or 2–4 online', art: 'antiscam', color: '#4d8dff', tag: 'Chaos' },
];
