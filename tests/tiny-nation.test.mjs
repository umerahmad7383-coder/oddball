/* Tiny Nation: accounting, endings, consequences.  Run: npm test */
import assert from 'node:assert/strict';
import * as M from '../games/tiny-nation/logic/sim.js';

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name); console.error(e); process.exitCode = 1; } };
function play(seed, strategy) {
  let s = M.newNation('Test', seed); const reports = []; const events = [];
  let guard = 0;
  while (!s.done && guard++ < 20) {
    const offer = M.offers(s);
    const pick = strategy === 'save' ? null : strategy === 'industry' ? (offer.find((k) => ['factory', 'motorway'].includes(k) && M.PROJECTS[k].cost <= s.money) || offer.find((k) => M.PROJECTS[k].cost <= s.money) || null) : (offer.find((k) => M.PROJECTS[k].cost <= s.money) || null);
    s = M.build(s, pick);
    const e = M.pickEvent(s); events.push(e);
    s = M.resolve(s, e, (seed + guard) % 2 ? 'a' : 'b');
    reports.push(s.lastReport);
  }
  return { s, reports, events, guard };
}
test('every year’s money adds up, over 300 random games', () => {
  for (let seed = 1; seed <= 300; seed++) for (const strat of ['any', 'industry', 'save']) {
    const { reports } = play(seed, strat);
    for (const r of reports) { const L = r.ledger; assert.equal(L.opening + L.project + L.interest + L.event + L.tax + L.income, L.closing, JSON.stringify(L)); }
  }
});
test('the money change shown for a year equals closing minus opening', () => {
  const { reports } = play(42, 'any');
  for (const r of reports) assert.equal(r.deltas.money, r.ledger.closing - r.ledger.opening);
});
test('every game ends after exactly ten years with sane numbers', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { s, guard } = play(seed, 'any');
    assert.ok(s.done); assert.equal(guard, 10);
    for (const k of ['money', 'pop', 'happy', 'green', 'commute', 'smart']) assert.ok(Number.isFinite(s[k]), `${k} is ${s[k]}`);
    assert.ok(s.happy >= 0 && s.happy <= 100 && s.green >= 0 && s.green <= 100);
    assert.ok(M.title(s).includes('Test')); assert.ok(Number.isFinite(M.score(s)));
  }
});
test('building a factory leads to a consequence two years later', () => {
  let hit = 0;
  for (let seed = 1; seed <= 200; seed++) {
    let s = M.newNation('T', seed);
    s = M.build(s, null); s = { ...s, money: 100 };
    s = M.build(s, 'factory');
    let found = false;
    for (let y = 0; y < 4 && !s.done; y++) {
      const e = M.pickEvent(s);
      if (e.id === 'strike') { found = true; assert.match(e.because, /factory in year 1/); assert.equal(s.turn, 3); break; }
      s = M.resolve(s, e, 'a'); s = M.build(s, null);
    }
    if (found) hit++;
  }
  assert.equal(hit, 200);
});
test('a consequence happens at most once per game', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { events } = play(seed, 'industry');
    const ids = events.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, `repeated event in seed ${seed}: ${ids}`);
  }
});
test('the research lab only appears once education reaches 50', () => {
  const s = M.newNation('T', 3);
  assert.ok(!M.offers({ ...s, smart: 30 }).includes('lab') && M.lockedProjects({ ...s, smart: 30 }).includes('lab'));
  assert.ok(!M.lockedProjects({ ...s, smart: 60 }).includes('lab'));
});
test('the flag never changes the game (it has its own seed)', () => {
  const a = play(77, 'any').s, b = play(77, 'any').s;
  assert.equal(M.score(a), M.score(b));
  assert.notDeepEqual(M.flagFor(1), M.flagFor(2));
});
console.log(`\n${passed} passed`);
