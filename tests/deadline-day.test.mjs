/* Deadline Day auction tests: affordability, bargain round, transactions.  Run: npm test */
import assert from 'node:assert/strict';
import { __test as T } from '../games/deadline-day/server/index.js';
import * as R from '../games/deadline-day/shared/rules.js';
import { FOOTBALLERS, BY_ID } from '../games/deadline-day/shared/players.js';
import { formationsFor } from '../games/deadline-day/shared/tactics.js';

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name); console.error(e); process.exitCode = 1; } };

function makeRoom({ mode = 'quick', budgets = [500, 500], pool = null } = {}) {
  const size = R.MODES[mode].size, formation = formationsFor(mode)[0];
  const players = new Map(), teams = {};
  budgets.forEach((b, i) => {
    const id = `p${i}`;
    players.set(id, { id, name: `M${i}`, color: '#000', connected: true, left: false });
    teams[id] = { budget: b, spent: 0, squad: [], formation, lineup: Array(size).fill(null), ready: false, idle: 0, auto: null };
  });
  const room = { players, settings: { mode }, game: { mode, size, phase: 'auction', pool: pool || FOOTBALLERS.map((f) => f.id), pi: 0, unsold: [], bargain: false, lot: null, lotN: 0, nextAt: 0, teams, history: [], academy: {}, tacticsEndsAt: 0, results: null } };
  const log = { pushes: 0, feed: [], events: [] };
  const api = { players: (r) => [...r.players.values()], pushRoom: () => { log.pushes++; }, broadcast: (r, m) => log.events.push(m), feed: (r, text) => log.feed.push(text) };
  return { room, api, log, g: room.game };
}
const send = (ctx, pid, m) => T.onMessage(ctx.room, ctx.room.players.get(pid), m, ctx.api);
const openLot = (ctx) => { ctx.g.lot.status = 'open'; };
const snapshot = (ctx) => JSON.stringify(Object.values(ctx.g.teams).map((t) => [t.budget, t.squad.length, t.spent]));
const priceOf = (id, g) => T.lotPrice(g, BY_ID[id]);

console.log('affordability: no catalogue cycling');
test('zero budget everywhere: straight to tactics in one call, no lots shown', () => {
  const ctx = makeRoom({ budgets: [0, 0] });
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'tactics');
  assert.equal(ctx.g.lotN, 0, 'no lot should be put up');
});
test('only cheap players are affordable: next lot is one of them, expensive ones set aside once', () => {
  const ctx = makeRoom({ budgets: [40, 40] }); // quick: 7 slots, max bid 40 - 6*5 = 10
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'auction');
  assert.ok(ctx.g.lot.price <= 10, `lot price ${ctx.g.lot.price} should be affordable`);
  assert.notEqual(ctx.g.lot.status, 'skipped');
  assert.ok(ctx.g.unsold.length > 100, 'unaffordable players go to the bargain bin');
  assert.ok(ctx.g.pool.slice(ctx.g.pi).every((id) => priceOf(id, ctx.g) <= 10), 'nothing unaffordable left in the round');
});
test('a skipped-at-full-price player still gets a bargain round (the old bug)', () => {
  // £60M, 7 empty slots -> max bid £30M. Find a player whose full price > 30 but half price <= 30.
  const ctx0 = makeRoom();
  const target = FOOTBALLERS.find((f) => R.startPrice(f.rating) > 30 && Math.round(R.startPrice(f.rating) / 2) <= 30);
  const ctx = makeRoom({ budgets: [60], pool: [target.id] });
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'auction', 'must not jump to tactics');
  assert.equal(ctx.g.bargain, true, 'bargain round started');
  assert.equal(ctx.g.lot.id, target.id);
  assert.ok(ctx.g.lot.price <= 30);
  void ctx0;
});
test('one poor manager does not end the auction for a rich one', () => {
  const ctx = makeRoom({ budgets: [0, 500] });
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'auction');
  assert.ok(!T.canBid(ctx.room, ctx.room.players.get('p0'), ctx.g.lot.price));
  assert.ok(T.canBid(ctx.room, ctx.room.players.get('p1'), ctx.g.lot.price));
});
test('nothing affordable even at half price: tactics, with a message', () => {
  const pricey = FOOTBALLERS.filter((f) => Math.round(R.startPrice(f.rating) / 2) > 10).map((f) => f.id);
  const ctx = makeRoom({ budgets: [40, 40], pool: pricey });
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'tactics');
  assert.equal(ctx.g.lotN, 0);
  assert.ok(ctx.log.feed.some((x) => /afford/i.test(x)));
});
test('all squads full: tactics', () => {
  const ctx = makeRoom();
  for (const t of Object.values(ctx.g.teams)) t.squad = Array.from({ length: 7 }, (_, i) => ({ id: FOOTBALLERS[i].id, price: 5 }));
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'tactics');
});
test('empty pool with an unfilled squad: academy fills it, tactics reached', () => {
  const ctx = makeRoom({ pool: [] });
  T.nextLot(ctx.room, ctx.api);
  assert.equal(ctx.g.phase, 'tactics');
  for (const t of Object.values(ctx.g.teams)) assert.equal(t.squad.length, 7);
});
test('a full auction run never shows a lot nobody can afford, and always ends', () => {
  const ctx = makeRoom({ budgets: [120, 500, 60] });
  let guard = 0;
  while (ctx.g.phase === 'auction' && guard++ < 1000) {
    T.nextLot(ctx.room, ctx.api);
    if (ctx.g.phase !== 'auction') break;
    const lot = ctx.g.lot;
    assert.notEqual(lot.status, 'skipped', `lot ${lot.n} was unaffordable`);
    openLot(ctx);
    const bidder = [...ctx.room.players.values()].find((p) => T.canBid(ctx.room, p, lot.price));
    if (bidder && Math.random() < 0.7) assert.equal(send(ctx, bidder.id, { t: 'bid', lot: lot.n, amount: lot.price }), null);
    T.settle(ctx.room, ctx.api); ctx.g.lot = null;
  }
  assert.equal(ctx.g.phase, 'tactics');
  assert.ok(guard < 400, `took ${guard} lots`);
  for (const t of Object.values(ctx.g.teams)) { assert.ok(t.budget >= 0, 'never negative'); assert.equal(t.squad.length, 7); assert.equal(t.spent + t.budget, ctx.g.teams[Object.keys(ctx.g.teams).find((k) => ctx.g.teams[k] === t)].spent + t.budget); }
});

console.log('purchases');
function withLot(budgets, price) {
  const id = FOOTBALLERS.find((f) => R.startPrice(f.rating) === price).id;
  const ctx = makeRoom({ budgets, pool: [id, ...FOOTBALLERS.map((f) => f.id).filter((x) => x !== id)] });
  T.nextLot(ctx.room, ctx.api); openLot(ctx);
  assert.equal(ctx.g.lot.id, id);
  return ctx;
}
const somePrice = R.startPrice(FOOTBALLERS[0].rating);
test('enough money: bid accepted, charged once at settlement', () => {
  const ctx = withLot([500, 500], somePrice);
  assert.equal(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: somePrice }), null);
  assert.equal(ctx.g.teams.p0.budget, 500, 'no money taken before the hammer');
  T.settle(ctx.room, ctx.api);
  assert.equal(ctx.g.teams.p0.budget, 500 - somePrice);
  assert.equal(ctx.g.teams.p0.squad.length, 1);
});
test('exactly enough (price + reserves): accepted', () => {
  const exact = somePrice + 6 * R.MIN_PRICE;
  const ctx = withLot([exact], somePrice);
  assert.equal(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: somePrice }), null);
  T.settle(ctx.room, ctx.api);
  assert.equal(ctx.g.teams.p0.budget, 6 * R.MIN_PRICE, 'reserves intact');
});
test('enough for the price but not the reserves: rejected, nothing changes', () => {
  const ctx = withLot([somePrice + 6 * R.MIN_PRICE - 1, 500], somePrice);
  const before = snapshot(ctx), lotBefore = JSON.stringify(ctx.g.lot);
  const err = send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: somePrice });
  assert.match(err, /kept back|bid up to/);
  assert.equal(snapshot(ctx), before); assert.equal(JSON.stringify(ctx.g.lot), lotBefore);
});
test('insufficient money: rejected with a clear message, state unchanged', () => {
  const ctx = withLot([somePrice - 1, 500], somePrice);
  const before = snapshot(ctx);
  assert.match(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: somePrice }), /Not enough money/);
  assert.equal(snapshot(ctx), before);
});
test('zero money: rejected, state unchanged', () => {
  const ctx = withLot([0, 500], somePrice);
  const before = snapshot(ctx);
  assert.ok(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: somePrice }));
  assert.equal(snapshot(ctx), before);
});
test('repeated clicks: only one bid counts, only one charge', () => {
  const ctx = withLot([500, 500], somePrice);
  const n = ctx.g.lot.n;
  assert.equal(send(ctx, 'p0', { t: 'bid', lot: n, amount: somePrice }), null);
  for (let i = 0; i < 5; i++) assert.ok(send(ctx, 'p0', { t: 'bid', lot: n, amount: somePrice }), 'duplicate rejected');
  assert.equal(ctx.g.lot.bids.length, 1);
  T.settle(ctx.room, ctx.api);
  T.settle(ctx.room, ctx.api); // a second settle must not double-charge
  assert.equal(ctx.g.teams.p0.budget, 500 - somePrice);
  assert.equal(ctx.g.teams.p0.squad.length, 1);
});
test('stale or missing lot: rejected', () => {
  const ctx = withLot([500, 500], somePrice);
  assert.match(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n + 1, amount: 999 }), /closed/);
  ctx.g.lot = null;
  assert.match(send(ctx, 'p0', { t: 'bid', lot: 1, amount: somePrice }), /closed/);
});
test('non-numeric or negative amounts: rejected', () => {
  const ctx = withLot([500, 500], somePrice);
  for (const amount of ['lots', -50, NaN, null]) assert.ok(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount }));
  assert.equal(ctx.g.lot.bids.length, 0);
});
test('several purchases in a row: money and squad always reconcile', () => {
  const ctx = makeRoom({ budgets: [500, 500] });
  let spent = 0;
  for (let i = 0; i < 4; i++) {
    T.nextLot(ctx.room, ctx.api); openLot(ctx);
    const price = ctx.g.lot.price;
    assert.equal(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: price }), null);
    T.settle(ctx.room, ctx.api); spent += price; ctx.g.lot = null;
  }
  const t = ctx.g.teams.p0;
  assert.equal(t.squad.length, 4); assert.equal(t.spent, spent); assert.equal(t.budget, 500 - spent);
});
test('full squad: cannot bid', () => {
  const ctx = withLot([500, 500], somePrice);
  ctx.g.teams.p0.squad = Array.from({ length: 7 }, (_, i) => ({ id: FOOTBALLERS[i + 5].id, price: 5 }));
  assert.match(send(ctx, 'p0', { t: 'bid', lot: ctx.g.lot.n, amount: somePrice }), /complete/);
});
console.log(`\n${passed} passed`);
