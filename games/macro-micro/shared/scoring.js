/* Macro / Micro — zoom maths and scoring. Pure functions shared by the game, the server and the tests.
 *
 * Zoom is a single number z: 1 = the whole photo, zMax = the starting magnification.
 * The slider works in log space, s ∈ [0, STEPS], z = zMax ^ (s / STEPS), so every notch feels the same.
 * The score depends ONLY on the furthest zoomed-out point reached (the lowest s), so it’s the same on any
 * mouse, trackpad or phone, and zooming back in never gives points back. */
export const STEPS = 1000;
export const START = 1000;
export const WRONG_PENALTY = 50;      // per distinct wrong guess
export const DETAIL_PIVOT = 2.5;      // below this zoom, the view drifts from the focus point to the whole photo
export const DIFFICULTY = {
  1: { name: 'Easy', floor: 150, curve: 0.75, defaultZoom: 3.5 },
  2: { name: 'Medium', floor: 100, curve: 1, defaultZoom: 5 },
  3: { name: 'Hard', floor: 50, curve: 1.3, defaultZoom: 7 },
};

export const zoomAt = (s, zMax) => Math.pow(zMax, Math.max(0, Math.min(STEPS, s)) / STEPS);
export const stepAt = (z, zMax) => Math.round((Math.log(Math.max(1, Math.min(zMax, z))) / Math.log(zMax)) * STEPS);

/** Points still on offer after zooming out as far as step `lowest` (STEPS = untouched, 0 = whole photo). */
export function scoreFor(lowest, difficulty = 2) {
  const d = DIFFICULTY[difficulty] || DIFFICULTY[2];
  const kept = Math.max(0, Math.min(STEPS, Math.round(lowest))) / STEPS; // 1 → 0 as you zoom out
  return Math.round(d.floor + (START - d.floor) * Math.pow(kept, d.curve));
}
/** Final score for a round: what was on offer, minus wrong guesses, never below zero. */
export function roundScore(lowest, difficulty, wrongCount, gaveUp = false) {
  if (gaveUp) return 0;
  return Math.max(0, scoreFor(lowest, difficulty) - WRONG_PENALTY * wrongCount);
}

/** Where the view is centred at zoom z, in 0–1 photo coordinates.
 *  Above DETAIL_PIVOT it stays locked on the focus point; below it, it eases towards the photo centre. */
export function viewCentre(z, focus) {
  const t = z >= DETAIL_PIVOT ? 1 : Math.log(Math.max(1, z)) / Math.log(DETAIL_PIVOT);
  const half = 0.5 / Math.max(1, z);
  const c = (f) => Math.max(half, Math.min(1 - half, 0.5 + (f - 0.5) * t));
  return { x: c(focus.x), y: c(focus.y) };
}
/** The part of the photo the detail layer must cover: everything visible at DETAIL_PIVOT and above. */
export function detailRegion(focus) {
  const half = 0.5 / DETAIL_PIVOT;
  const c = (f) => Math.max(half, Math.min(1 - half, f));
  return { x: c(focus.x) - half, y: c(focus.y) - half, w: half * 2, h: half * 2 };
}

export const TITLES = [
  [900, 'Microscopic Genius'], [750, 'Sharp Observer'], [550, 'Good Eye'], [350, 'Getting Warmer'], [0, 'Needs a Microscope'],
];
export const titleFor = (avg) => (TITLES.find(([min]) => avg >= min) || TITLES[TITLES.length - 1])[1];
