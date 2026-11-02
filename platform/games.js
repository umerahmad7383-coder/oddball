/* The oddball catalogue. The hub renders one tile per entry, in this order.
 * Add a game: create games/<slug>/, a page at <slug>/index.html, and an entry here. */
export const SITE = { name: 'oddball', tagline: 'Strange little games. Most of them better with friends.' };

export const GAMES = [
  {
    slug: 'deadline-day', href: '/deadline-day/', title: 'Deadline Day', blurb: 'Live football transfer auction. £500M, one squad, your friends bidding against you.',
    players: '2–8 online', art: 'deadline', isNew: true,
  },
  {
    slug: 'anti-scam', href: '/anti-scam/', title: 'Anti-Scam Arcade', blurb: 'Survive three minutes on a cursed 2004 desktop full of pop-ups and scammers.',
    players: 'Solo or 2–4 online', art: 'antiscam',
  },
];
