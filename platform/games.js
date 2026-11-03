/* The oddball catalogue, in display order.
 * Add a game: create games/<slug>/, a page at <slug>/index.html, an entry here, and art in hub/Hub.jsx. */
export { SITE } from './site.config.js';

export const GAMES = [
  { slug: 'deadline-day', href: '/deadline-day/', title: 'Deadline Day', blurb: 'Bid against your friends for real footballers. Best XI wins.', players: '2–8 players, online', art: 'deadline', isNew: true },
  { slug: 'normal-form', href: '/normal-form/', title: 'The Perfectly Normal Form', blurb: 'It’s just a form. Mostly.', players: 'Solo', art: 'form', isNew: true },
  { slug: 'tiny-nation', href: '/tiny-nation/', title: 'Tiny Nation', blurb: 'You get an island and ten years. Try not to ruin it.', players: 'Solo', art: 'nation', isNew: true },
  { slug: 'anti-scam', href: '/anti-scam/', title: 'Anti-Scam Arcade', blurb: 'Survive three minutes on the worst computer ever made.', players: 'Solo, or 2–4 online', art: 'antiscam' },
];
