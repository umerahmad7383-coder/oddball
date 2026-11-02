/* The Perfectly Normal Form — rules. Pure functions, no UI.
 * Each run picks a few variations (weekday, banned letter…) so replays differ. */
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const FRUITS = ['apple', 'apricot', 'banana', 'berry', 'cherry', 'coconut', 'date', 'fig', 'grape', 'guava', 'kiwi', 'lemon', 'lime', 'lychee', 'mango', 'melon', 'olive', 'orange', 'papaya', 'peach', 'pear', 'plum', 'quince'];
export const HEARD = ['Please choose…', 'A friend told me', 'An advert', 'A search engine', 'A carrier pigeon', 'A dream', 'I didn’t'];

export function makeVariant(seed = Math.random()) {
  const r = (n) => Math.floor(((seed * 9301 + n * 49297) % 233280) / 233280 * 1000) % 1000;
  const day = [2, 4, 1, 3][r(1) % 4];          // Tuesday, Thursday, Monday or Wednesday
  const letter = ['e', 'a', 'o', 'i'][r(2) % 4];
  return { day, letter };
}

const letters = (s) => (s.match(/\p{L}/gu) || []).length;
const isPrime = (n) => { if (!Number.isInteger(n) || n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const parseDob = (v) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null; const d = new Date(`${v}T12:00:00Z`); return Number.isNaN(d.getTime()) ? null : d; };
const fav = (v) => (/^\s*\d+\s*$/.test(v || '') ? Number(v) : NaN);
const reverse = (s) => [...s].reverse().join('');

/** Ordered rules. Each later rule only appears once every earlier one passes. */
export function buildRules(variant) {
  const dayName = WEEKDAYS[variant.day];
  const L = variant.letter;
  return [
    { id: 'name', field: 'name', text: 'Please enter your full name (at least two words).', check: (f) => f.name.trim().split(/\s+/).filter(Boolean).length >= 2, clerk: 'Lovely. A name. We love those.' },
    { id: 'dob', field: 'dob', text: 'Please enter your date of birth.', check: (f) => { const d = parseDob(f.dob); return !!d && d.getUTCFullYear() >= 1900 && d <= new Date(); }, clerk: 'Born. Good start.' },
    { id: 'email', field: 'email', text: 'Please enter a valid email address.', check: (f) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()), clerk: 'We will never email you. Probably.' },
    { id: 'fav', field: 'fav', text: 'Please enter your favourite number (a whole number from 1 to 99).', check: (f) => { const n = fav(f.fav); return n >= 1 && n <= 99; }, clerk: 'Interesting choice. Noted.' },
    { id: 'day', field: 'dob', text: `You must have been born on a ${dayName}.`, check: (f) => { const d = parseDob(f.dob); return !!d && d.getUTCDay() === variant.day; }, clerk: `${dayName} people only, I'm afraid. Policy.` },
    { id: 'agree', field: 'agree', text: 'Untick “I agree to everything”. We don’t trust people who agree that quickly.', check: (f) => !f.agree, clerk: 'Much better. Healthy scepticism.' },
    { id: 'prime', field: 'fav', text: 'Your favourite number must be a prime number.', check: (f) => isPrime(fav(f.fav)), clerk: 'Primes are tidier. Everyone knows that.' },
    { id: 'fruit', field: 'email', text: 'Your email address must contain a fruit.', check: (f) => FRUITS.some((x) => f.email.toLowerCase().includes(x)), clerk: 'Fruity. For the database.' },
    { id: 'letter', field: 'name', text: `Your name can’t contain the letter “${L.toUpperCase()}”, upper or lower case.`, check: (f) => !f.name.toLowerCase().includes(L), clerk: `We're having a shortage of ${L.toUpperCase()}s this quarter.` },
    { id: 'heard', field: 'heard', text: 'How did you hear about us? Be honest.', check: (f) => f.heard === 'I didn’t', clerk: 'Honesty! Rare in this office.' },
    { id: 'sum', field: 'fav', text: 'The digits of your birth year must add up to your favourite number.', check: (f) => { const d = parseDob(f.dob); if (!d) return false; return String(d.getUTCFullYear()).split('').reduce((a, b) => a + Number(b), 0) === fav(f.fav); }, clerk: 'Numerology department will be pleased.' },
    { id: 'len', field: 'name', text: 'Your name must have exactly as many letters as your favourite number (spaces don’t count).', check: (f) => letters(f.name) === fav(f.fav), clerk: 'Perfectly proportioned. Admin approves.' },
    { id: 'sign', field: 'sign', text: 'Sign the form with your full name written backwards.', check: (f) => f.name.trim().length > 0 && f.sign.trim().toLowerCase() === reverse(f.name.trim()).toLowerCase(), clerk: 'A beautiful signature. Very backwards.' },
  ];
}

export function evaluateRules(rules, form) {
  return rules.map((r) => ({ ...r, ok: !!r.check(form) }));
}
/** How many rules are visible: all passing ones in order, plus the first failing one. */
export function revealedCount(results, current) {
  let n = current;
  while (n < results.length && results.slice(0, n).every((r) => r.ok)) n++;
  return Math.max(1, Math.min(results.length, n));
}
export const emptyForm = () => ({ name: '', dob: '', email: '', fav: '', heard: HEARD[0], agree: true, sign: '' });
