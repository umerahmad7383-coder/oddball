/* Deadline Day — rules shared by the browser and the server. Money is in £ millions. */
export const GAME_ID = 'deadline-day';
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const BUDGET = 500;
export const MIN_PRICE = 5;            // cheapest any footballer can go for; also the reserve per empty slot
export const MODES = {
  classic: { label: 'Classic', size: 11, tacticsSec: 60, blurb: 'Full XI. 11 signings each.' },
  quick: { label: 'Quick', size: 7, tacticsSec: 45, blurb: '7-a-side. Faster auctions.' },
};
export const REVEAL_MS = 2200;         // card flip before bidding opens
export const BID_MS = 20_000;          // normal countdown
export const EXTEND_WINDOW_MS = 5_000; // a bid inside the last 5s…
export const EXTEND_TO_MS = 8_000;     // …resets the clock to 8s
export const CLOSING_MS = 1_600;       // "going, going…" once everyone else has passed
export const SOLD_MS = 3_000;
export const UNSOLD_MS = 1_800;
export const SKIP_MS = 1_300;
export const AWAY_AFTER_LOTS = 3;      // ignore 3 lots in a row and you auto-pass until you act again
export const COLORS = ['#ff5a36', '#2f6bff', '#16a34a', '#d946ef', '#f59e0b', '#06b6d4', '#e11d48', '#7c3aed'];

/** Bid steps grow with the price. */
export function increment(price) {
  if (price < 20) return 1;
  if (price < 50) return 2;
  if (price < 100) return 5;
  return 10;
}
/** The smallest bid that would lead the lot right now. */
export function nextBid(lot) { return lot.leaderId ? lot.price + increment(lot.price) : lot.startPrice; }
/** Most a manager can bid while keeping £5M for every other empty slot. */
export function maxBid(team, size) {
  const emptyAfter = Math.max(0, size - team.squad.length - 1);
  return Math.max(0, team.budget - emptyAfter * MIN_PRICE);
}
export function startPrice(rating) {
  if (rating >= 90) return 70;
  if (rating >= 88) return 55;
  if (rating >= 86) return 40;
  if (rating >= 84) return 28;
  if (rating >= 82) return 18;
  if (rating >= 80) return 12;
  if (rating >= 78) return 8;
  return MIN_PRICE;
}
export function fmtM(m) {
  const v = Math.round(m);
  if (Math.abs(v) >= 1000) return `£${(v / 1000).toFixed(2).replace(/\.?0+$/, '')}B`;
  return `£${v}M`;
}
/** Final Score = (Average Effective OVR × 0.85) + (Chemistry % × 0.15) */
export const finalScore = (avgEff, chemPct) => Math.round((avgEff * 0.85 + chemPct * 0.15) * 10) / 10;
