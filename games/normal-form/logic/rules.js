/* The Perfectly Normal Form — rules. Pure functions, no UI.
 * Three acts. Later rules lean on earlier answers, so fixing one thing can break another.
 * Each game picks a variant (weekday, banned letter, minimum name length) so the same answers never work twice. */
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const FRUITS = ['apple', 'apricot', 'banana', 'berry', 'cherry', 'coconut', 'date', 'fig', 'grape', 'guava', 'kiwi', 'lemon', 'lime', 'lychee', 'mango', 'melon', 'olive', 'orange', 'papaya', 'peach', 'pear', 'plum', 'quince'];
export const HEARD = ['Please choose…', 'A friend told me', 'An advert', 'A search engine', 'A carrier pigeon', 'A dream', 'I didn’t'];
export const ACTS = [
  { n: 1, name: 'The basics', clerk: 'Right. Just the basics first.' },
  { n: 2, name: 'Getting specific', clerk: 'Lovely. Now a few small details for the database.' },
  { n: 3, name: 'Everything must agree', clerk: 'Nearly there. The answers just need to agree with each other.' },
];

/* name length ranges; each one forces a different prime, birth year and name */
export const LEN_RANGES = { 9: 12, 13: 15, 16: 19 };
const MIN_LEN = Object.keys(LEN_RANGES).map(Number);
export function makeVariant(rand = Math.random) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  return { v: 2, day: pick([1, 2, 3, 4]), letter: pick(['e', 'a', 'o', 'i']), minLen: pick(MIN_LEN) };
}

export const letters = (s) => (String(s).match(/\p{L}/gu) || []).length;
export const isPrime = (n) => { if (!Number.isInteger(n) || n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
export const parseDob = (v) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null; const d = new Date(`${v}T12:00:00Z`); return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : d; };
const fav = (v) => (/^\s*\d+\s*$/.test(v || '') ? Number(v) : NaN);
const reverse = (s) => [...s].reverse().join('');
const words = (s) => s.trim().split(/\s+/).filter(Boolean);
const initials = (s) => words(s).map((w) => w[0]).join('').toLowerCase();

/** Ordered rules. A rule only appears once every earlier one passes. */
export function buildRules(variant) {
  const dayName = WEEKDAYS[variant.day];
  const L = variant.letter, N = variant.minLen, M = LEN_RANGES[variant.minLen] || variant.minLen + 3;
  return [
    // Act 1
    { id: 'name', act: 1, field: 'name', text: 'Please enter your full name (at least two words).', check: (f) => words(f.name).length >= 2, clerk: 'A name. We love those.' },
    { id: 'dob', act: 1, field: 'dob', text: 'Please enter your date of birth.', check: (f) => { const d = parseDob(f.dob); return !!d && d.getUTCFullYear() >= 1900 && d <= new Date(); }, clerk: 'Born. Good start.' },
    { id: 'email', act: 1, field: 'email', text: 'Please enter a valid email address.', check: (f) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()), clerk: 'We will never email you. Probably.' },
    { id: 'fav', act: 1, field: 'fav', text: 'Please enter your favourite number (a whole number from 1 to 99).', check: (f) => { const n = fav(f.fav); return n >= 1 && n <= 99; }, clerk: 'Interesting choice. Noted.' },
    { id: 'agree', act: 1, field: 'agree', text: 'Untick “I agree to everything”. We don’t trust people who agree that quickly.', check: (f) => !f.agree, clerk: 'Healthy scepticism. Approved.' },
    // Act 2
    { id: 'day', act: 2, field: 'dob', text: `You must have been born on a ${dayName}.`, check: (f) => { const d = parseDob(f.dob); return !!d && d.getUTCDay() === variant.day; }, clerk: `${dayName} people only. Policy.` },
    { id: 'prime', act: 2, field: 'fav', text: 'Your favourite number must be a prime number.', check: (f) => isPrime(fav(f.fav)), clerk: 'Primes are tidier. Everyone knows that.' },
    { id: 'fruit', act: 2, field: 'email', text: 'Your email address must contain a fruit.', check: (f) => FRUITS.some((x) => f.email.toLowerCase().includes(x)), clerk: 'Fruity. For the records.' },
    { id: 'letter', act: 2, field: 'name', text: `Your name can’t contain the letter “${L.toUpperCase()}”.`, check: (f) => !f.name.toLowerCase().includes(L), clerk: `We’re short of ${L.toUpperCase()}s this quarter.` },
    { id: 'long', act: 2, field: 'name', text: `Your name must have between ${N} and ${M} letters. Our filing cabinets are a specific size.`, check: (f) => { const n = letters(f.name); return n >= N && n <= M; }, clerk: 'Fits the cabinet perfectly.' },
    { id: 'heard', act: 2, field: 'heard', text: 'How did you hear about us? Be honest.', check: (f) => f.heard === 'I didn’t', clerk: 'Honesty! Rare in this office.' },
    // Act 3
    { id: 'sum', act: 3, field: 'fav', text: 'The digits of your birth year must add up to your favourite number.', check: (f) => { const d = parseDob(f.dob); if (!d) return false; return String(d.getUTCFullYear()).split('').reduce((a, b) => a + Number(b), 0) === fav(f.fav); }, clerk: 'Numerology will be thrilled.' },
    { id: 'len', act: 3, field: 'name', text: 'Your name must have exactly as many letters as your favourite number (spaces don’t count).', check: (f) => letters(f.name) === fav(f.fav), clerk: 'Perfectly proportioned.' },
    { id: 'month', act: 3, field: 'name', text: 'Your name can’t use any letter from the name of the month you were born in.', check: (f) => { const d = parseDob(f.dob); if (!d) return false; const m = MONTHS[d.getUTCMonth()].toLowerCase(); return ![...f.name.toLowerCase()].some((c) => /\p{L}/u.test(c) && m.includes(c)); }, clerk: 'Months are very possessive about their letters.' },
    { id: 'initials', act: 3, field: 'email', text: 'Your email address must start with your initials.', check: (f) => { const i = initials(f.name); return i.length >= 2 && f.email.trim().toLowerCase().startsWith(i); }, clerk: 'So we know whose email it is.' },
    { id: 'dayno', act: 3, field: 'email', text: 'The day of the month you were born must appear in your email address.', check: (f) => { const d = parseDob(f.dob); return !!d && f.email.includes(String(d.getUTCDate())); }, clerk: 'For birthday cards we will never send.' },
    { id: 'sign', act: 3, field: 'sign', text: 'Sign the form with your full name written backwards.', check: (f) => f.name.trim().length > 0 && f.sign.trim().toLowerCase() === reverse(f.name.trim()).toLowerCase(), clerk: 'A beautiful signature. Very backwards.' },
  ];
}

export function evaluateRules(rules, form) { return rules.map((r) => ({ ...r, ok: !!r.check(form) })); }
/** How many rules are visible: everything up to and including the first failing rule. */
export function revealedCount(results, current) {
  let n = current;
  while (n < results.length && results.slice(0, n).every((r) => r.ok)) n++;
  return Math.max(1, Math.min(results.length, n));
}
export const emptyForm = () => ({ name: '', dob: '', email: '', fav: '', heard: HEARD[0], agree: true, sign: '' });

/** Builds one valid answer for a variant, or null. Used by the tests to prove every variant can be solved. */
export function solve(variant) {
  const rules = buildRules(variant);
  for (let y = 1900; y <= new Date().getUTCFullYear(); y++) {
    const sum = String(y).split('').reduce((a, b) => a + Number(b), 0);
    if (!isPrime(sum) || sum < variant.minLen || sum > (LEN_RANGES[variant.minLen] || 99)) continue;
    for (let m = 0; m < 12; m++) {
      const banned = new Set((MONTHS[m] + variant.letter).toLowerCase());
      const alphabet = [...'bcdfghjklmnpqrstvwxyzuaeio'].filter((c) => !banned.has(c));
      if (alphabet.length < 2) continue;
      for (let d = 1; d <= 28; d++) {
        const date = new Date(Date.UTC(y, m, d, 12));
        if (date.getUTCDay() !== variant.day || date > new Date()) continue;
        const first = Math.floor(sum / 2), second = sum - first;
        const word = (n, c) => c.toUpperCase() + Array.from({ length: n - 1 }, (_, i) => alphabet[(i + 1) % alphabet.length]).join('');
        const name = `${word(first, alphabet[0])} ${word(second, alphabet[1])}`;
        const f = { name, dob: date.toISOString().slice(0, 10), email: `${alphabet[0]}${alphabet[1]}.fig${d}@example.com`, fav: String(sum), heard: 'I didn’t', agree: false, sign: reverse(name) };
        if (evaluateRules(rules, f).every((r) => r.ok)) return f;
      }
    }
  }
  return null;
}
