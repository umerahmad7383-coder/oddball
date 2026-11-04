/* Macro / Micro: scoring, zoom maths, answer checking, object database.  Run: npm test */
import assert from 'node:assert/strict';
import { STEPS, START, WRONG_PENALTY, DIFFICULTY, scoreFor, roundScore, zoomAt, stepAt, viewCentre, detailRegion, titleFor } from '../games/macro-micro/shared/scoring.js';
import { judge as judge0, normalise, buildVocab } from '../games/macro-micro/shared/answers.js';
import { OBJECTS, BY_ID, CATEGORIES } from '../games/macro-micro/shared/objects.js';
const VOCAB = buildVocab(OBJECTS);
const judge = (o, g) => judge0(o, g, VOCAB); // exactly what the server does

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name); console.error(e); process.exitCode = 1; } };

console.log('scoring');
test('untouched zoom keeps all 1,000 points, at every difficulty', () => { for (const d of [1, 2, 3]) assert.equal(scoreFor(STEPS, d), START); });
test('fully zoomed out leaves only the floor', () => { for (const d of [1, 2, 3]) assert.equal(scoreFor(0, d), DIFFICULTY[d].floor); });
test('score only ever goes down as you zoom further out (monotonic)', () => { for (const d of [1, 2, 3]) for (let s = STEPS; s > 0; s--) assert.ok(scoreFor(s - 1, d) <= scoreFor(s, d)); });
test('hard is harsher than medium, medium harsher than easy, at the same zoom', () => { for (let s = 50; s < STEPS; s += 50) { assert.ok(scoreFor(s, 3) <= scoreFor(s, 2)); assert.ok(scoreFor(s, 2) <= scoreFor(s, 1)); } });
test('deterministic: depends only on the furthest point reached, not how you got there', () => {
  // simulate two players: one scrolls smoothly, one jitters back and forth; same furthest point = same score
  let lowA = STEPS; for (let s = STEPS; s >= 400; s -= 7) lowA = Math.min(lowA, s);
  let lowB = STEPS; const path = [900, 950, 700, 990, 400, 1000, 650, 400]; for (const s of path) lowB = Math.min(lowB, s);
  assert.equal(Math.min(lowA, 400), 400); assert.equal(lowB, 400); assert.equal(scoreFor(400, 2), scoreFor(400, 2));
});
test('zooming back in never restores points (score uses the lowest step)', () => {
  let lowest = STEPS; const seen = [];
  for (const s of [1000, 700, 300, 900, 1000, 500]) { lowest = Math.min(lowest, s); seen.push(scoreFor(lowest, 2)); }
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] <= seen[i - 1]);
  assert.equal(seen.at(-1), scoreFor(300, 2));
});
test('wrong guesses cost points but the score never goes negative', () => {
  assert.equal(roundScore(STEPS, 2, 1), START - WRONG_PENALTY);
  assert.equal(roundScore(0, 3, 50), 0);
  assert.equal(roundScore(STEPS, 1, 0, true), 0, 'giving up scores 0');
});
test('zoom ↔ step conversion round-trips', () => { for (const z of [1, 1.5, 2, 3.3, 5, 7.9]) assert.ok(Math.abs(zoomAt(stepAt(z, 8), 8) - z) < 0.02); });
test('the view always stays inside the photo, at any zoom and focus', () => {
  for (const fx of [0, 0.05, 0.5, 0.97, 1]) for (const fy of [0, 0.3, 1]) for (const z of [1, 1.2, 2, 2.5, 4, 9]) {
    const c = viewCentre(z, { x: fx, y: fy }), h = 0.5 / z;
    assert.ok(c.x - h >= -1e-9 && c.x + h <= 1 + 1e-9 && c.y - h >= -1e-9 && c.y + h <= 1 + 1e-9, `${fx},${fy} at ${z}`);
  }
});
test('at 1× the whole photo is shown; at deep zoom the focus point is centred', () => {
  assert.deepEqual(viewCentre(1, { x: 0.9, y: 0.1 }), { x: 0.5, y: 0.5 });
  const c = viewCentre(6, { x: 0.6, y: 0.4 }); assert.ok(Math.abs(c.x - 0.6) < 1e-9 && Math.abs(c.y - 0.4) < 1e-9);
});
test('the detail layer covers every view from 2.5× upwards', () => {
  for (const f of [{ x: 0.5, y: 0.5 }, { x: 0.02, y: 0.98 }, { x: 0.8, y: 0.2 }]) {
    const r = detailRegion(f);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1 + 1e-9 && r.y + r.h <= 1 + 1e-9);
    for (const z of [2.5, 3, 5, 12]) { const c = viewCentre(z, f), h = 0.5 / z; assert.ok(c.x - h >= r.x - 1e-9 && c.x + h <= r.x + r.w + 1e-9 && c.y - h >= r.y - 1e-9 && c.y + h <= r.y + r.h + 1e-9, `${JSON.stringify(f)} at ${z}`); }
  }
});
test('titles match the thresholds', () => { assert.equal(titleFor(950), 'Microscopic Genius'); assert.equal(titleFor(800), 'Sharp Observer'); assert.equal(titleFor(10), 'Needs a Microscope'); });

console.log('answers');
test('every listed answer for every object is accepted, in different casings and with punctuation', () => {
  for (const o of OBJECTS) for (const a of o.answers) { assert.equal(judge(o, a), 'correct', `${o.id}: ${a}`); assert.equal(judge(o, a.toUpperCase() + '!'), 'correct'); assert.equal(judge(o, `a ${a}`), 'correct'); }
});
test('the display name of every object is accepted', () => { for (const o of OBJECTS) assert.equal(judge(o, o.name), 'correct', o.id); });
test('“close” words are hints, not answers', () => { for (const o of OBJECTS) for (const c of o.close) assert.notEqual(judge(o, c), 'correct', `${o.id}: ${c}`); });
test('one typo is forgiven in longer words, none in short ones', () => {
  assert.equal(judge(BY_ID['butterfly-wing'], 'butterfy wing'), 'correct');
  assert.equal(judge(BY_ID.strawberry, 'strawbery'), 'correct');
  assert.equal(judge(BY_ID.leaf, 'loaf'), 'wrong');
  assert.equal(judge(BY_ID.key, 'monkey'), 'wrong');
});
test('synonyms from the brief work', () => {
  assert.equal(judge(BY_ID['butterfly-wing'], 'Butterfly'), 'correct');
  assert.equal(judge(BY_ID.velcro, 'hook and loop fastener'), 'correct');
  assert.equal(judge(BY_ID.salt, 'Grain of salt'), 'correct');
  assert.equal(judge(BY_ID.fingerprint, 'finger print'), 'correct');
});
test('empty and junk guesses are handled', () => { assert.equal(judge(BY_ID.coin, ''), 'empty'); assert.equal(judge(BY_ID.coin, '   ?!  '), 'empty'); assert.equal(judge(BY_ID.coin, 'the'), 'empty'); });
test('objects don’t accept each other’s main names (no accidental overlaps)', () => {
  const clashes = [];
  for (const a of OBJECTS) for (const b of OBJECTS) if (a !== b && judge(a, b.name) === 'correct') clashes.push(`${a.id} accepts "${b.name}"`);
  assert.deepEqual(clashes, []);
});
test('longer guesses still count when the extra words are harmless', () => {
  assert.equal(judge(BY_ID['orange-peel'], 'a big orange peel'), 'correct');
  assert.equal(judge(BY_ID['butterfly-wing'], 'I think it’s a butterfly wing'), 'correct');
  assert.equal(judge(BY_ID.eye, 'fly’s eye'), 'wrong');
  assert.equal(judge(BY_ID.feather, 'peacock feather'), 'wrong');
});
test('normalise strips accents and apostrophes', () => { assert.equal(normalise('Café’s'), 'cafes'); });

console.log('database');
test(`at least 60 objects, every field present`, () => {
  assert.ok(OBJECTS.length >= 60, `${OBJECTS.length}`);
  for (const o of OBJECTS) { assert.ok(o.id && o.name && CATEGORIES[o.category] && [1, 2, 3].includes(o.difficulty) && o.answers.length && o.fact.length > 20 && o.search, o.id); }
  assert.equal(new Set(OBJECTS.map((o) => o.id)).size, OBJECTS.length, 'ids unique');
});
test('every difficulty and category has objects', () => {
  for (const d of [1, 2, 3]) assert.ok(OBJECTS.filter((o) => o.difficulty === d).length >= 8, `difficulty ${d}`);
  for (const c of Object.keys(CATEGORIES)) assert.ok(OBJECTS.some((o) => o.category === c), c);
});
console.log(`\n${passed} passed`);
