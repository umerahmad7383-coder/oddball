/* Answer checking. Forgiving about wording, spelling and plurals; never about the actual object. */
const STOP = new Set(['a', 'an', 'the', 'of', 'some', 'piece', 'bit', 'close', 'up', 'closeup', 'macro', 'photo', 'picture', 'is', 'it', 's', 'my', 'its', 'this', 'that', 'on', 'from', 'in']);

export function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')    // é -> e
    .replace(/[’'`]/g, '')                               // fly's -> flys
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const singular = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && /(ches|shes|xes|ses)$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
export const tokens = (s) => normalise(s).split(' ').filter((w) => w && !STOP.has(w)).map(singular);
const key = (s) => tokens(s).join(' ');

/** Edit distance with an early exit once it passes `max`. */
export function distance(a, b, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
const allowedTypos = (len) => (len >= 9 ? 2 : len >= 5 ? 1 : 0);
function near(a, b) { // whole phrases, with spaces removed so "honey comb" = "honeycomb"
  const x = a.replace(/ /g, ''), y = b.replace(/ /g, '');
  if (x === y) return true;
  return distance(x, y, 2) <= allowedTypos(Math.min(x.length, y.length));
}

/** Every word that appears in any object's answers. A longer guess like "fly's eye" must not count as
 *  plain "eye" just because it contains it: the extra word "fly" belongs to another object. */
export function buildVocab(objects) {
  const v = new Map();
  for (const o of objects) for (const a of o.answers) for (const w of tokens(a)) { if (!v.has(w)) v.set(w, new Set()); v.get(w).add(o.id); }
  return v;
}

/** -> 'correct' | 'close' | 'wrong' | 'empty' */
export function judge(object, guess, vocab = null) {
  const g = key(guess);
  if (!g) return 'empty';
  const answers = object.answers.map(key);
  if (answers.some((a) => near(g, a))) return 'correct';
  // a longer guess that contains a full answer, e.g. "a big orange peel" or "it's a butterfly's wing"
  const gw = g.split(' ');
  const own = new Set(answers.flatMap((a) => a.split(' ')).concat(object.close.map(key).flatMap((c) => c.split(' '))));
  for (const a of answers) {
    const aw = a.split(' ');
    if (!aw.length || !aw.every((w) => gw.some((x) => near(x, w)))) continue;
    const extra = gw.filter((x) => !aw.some((w) => near(x, w)));
    const foreign = vocab && extra.some((x) => !own.has(x) && vocab.has(x) && ![...vocab.get(x)].every((id) => id === object.id));
    if (!foreign) return 'correct';
  }
  const close = object.close.map(key);
  if (close.some((c) => near(g, c) || gw.some((x) => near(x, c)))) return 'close';
  return 'wrong';
}
