/* The Perfectly Normal Form: every variant is solvable, and no single answer solves them all. */
import assert from 'node:assert/strict';
import { buildRules, evaluateRules, makeVariant, solve } from '../games/normal-form/logic/rules.js';

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log('  ✓', name); } catch (e) { console.log('  ✗', name); console.error(e); process.exitCode = 1; } };
const all = [];
for (const day of [1, 2, 3, 4]) for (const letter of ['e', 'a', 'o', 'i']) for (const minLen of [9, 13, 16]) all.push({ v: 2, day, letter, minLen });

test(`all ${all.length} variants have a valid solution`, () => {
  for (const v of all) assert.ok(solve(v), `unsolvable: ${JSON.stringify(v)}`);
});
test('random variants only produce known combinations', () => {
  for (let i = 0; i < 500; i++) { const v = makeVariant(); assert.ok(all.some((a) => a.day === v.day && a.letter === v.letter && a.minLen === v.minLen)); }
});
test('the old universal answer (two-letter name, number 2) no longer works', () => {
  const old = { name: 'A B', dob: '2000-01-04', email: 'fig@x.co', fav: '2', heard: 'I didn’t', agree: false, sign: 'B A' };
  for (const v of all) assert.ok(!evaluateRules(buildRules(v), old).every((r) => r.ok));
});
test('no single answer solves every variant', () => {
  for (const v of all) {
    const sol = solve(v);
    const others = all.filter((w) => evaluateRules(buildRules(w), sol).every((r) => r.ok));
    assert.ok(others.length <= 4, `${JSON.stringify(v)} solution also solves ${others.length} variants`);
  }
});
test('different minimum lengths force a different favourite number', () => {
  const favs = new Set([9, 13, 16].map((minLen) => solve({ v: 2, day: 2, letter: 'e', minLen }).fav));
  assert.equal(favs.size, 3);
});
test('later rules can break earlier answers (the tension is real)', () => {
  const v = { v: 2, day: 2, letter: 'e', minLen: 13 };
  const sol = solve(v);
  const broken = { ...sol, name: sol.name + 'x' }; // one more letter breaks "letters = favourite number"
  const res = evaluateRules(buildRules(v), broken);
  assert.ok(!res.find((r) => r.id === 'len').ok);
  assert.ok(!res.find((r) => r.id === 'sign').ok, 'and the signature no longer matches');
});
test('invalid dates such as 31 February are rejected', () => {
  const v = { v: 2, day: 2, letter: 'e', minLen: 9 };
  const res = evaluateRules(buildRules(v), { ...solve(v), dob: '1999-02-31' });
  assert.ok(!res.find((r) => r.id === 'dob').ok);
});
console.log(`\n${passed} passed`);
