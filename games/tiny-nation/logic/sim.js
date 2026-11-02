/* Tiny Nation — the simulation. Pure functions, no UI. A toy, not a policy model. */
export const TURNS = 10;
export const STATS = ['money', 'pop', 'happy', 'green', 'commute', 'smart'];

export const PROJECTS = {
  houses: { name: 'Terraced houses', cost: 20, fx: { cap: 260, happy: 2, commute: 2 }, line: 'Rows of tidy little homes with tidy little arguments about bins.' },
  park: { name: 'Big park', cost: 12, fx: { happy: 6, green: 7 }, line: 'Ducks move in immediately. They are not paying rent.' },
  school: { name: 'School', cost: 24, fx: { smart: 12, happy: 3 }, line: 'Children learn long division and immediately forget it.' },
  library: { name: 'Library', cost: 14, fx: { smart: 6, happy: 2 }, line: 'Quiet, warm and full of people pretending to read.' },
  factory: { name: 'Factory', cost: 18, fx: { income: 8, green: -12, happy: -2, cap: 80 }, line: 'Makes widgets. Nobody knows what a widget is. Very profitable.' },
  solar: { name: 'Solar farm', cost: 22, fx: { income: 3, green: 8 }, line: 'Shiny. Silent. Mildly smug.' },
  wind: { name: 'Wind turbines', cost: 20, fx: { income: 3, green: 6, happy: -1 }, line: 'Locals have nicknamed them “the big fans”.' },
  tram: { name: 'Tram line', cost: 30, fx: { commute: -9, green: 3, happy: 3 }, line: 'Ding ding. Commuters weep with joy.' },
  motorway: { name: 'Motorway', cost: 26, fx: { commute: -6, green: -10, happy: 1, cap: 80 }, line: 'Faster for now. Traffic engineers make a nervous face.' },
  hospital: { name: 'Hospital', cost: 28, fx: { happy: 8, cap: 60 }, line: 'Free biscuits in the waiting room. Morale up.' },
  stadium: { name: 'Stadium', cost: 34, fx: { happy: 12, income: 2, commute: 2 }, line: 'The national team loses every week. Everyone loves it.' },
  harbour: { name: 'Harbour', cost: 30, fx: { income: 6, cap: 120, green: -4 }, line: 'Boats arrive with goods, tourists and one very large crab.' },
  museum: { name: 'Museum of Odd Things', cost: 18, fx: { happy: 5, smart: 3, income: 1 }, line: 'Featuring a spoon that may have belonged to someone.' },
};

/* Dilemmas. `when` decides if an event can appear; each choice has effects and a punchline. */
export const EVENTS = [
  { id: 'goose', text: 'A giant goose has occupied the harbour and is refusing to leave.', a: { label: 'Negotiate with bread', fx: { money: -8, happy: 3 }, out: 'The goose accepts. Bread budget doubles.' }, b: { label: 'Make it the national bird', fx: { happy: 6 }, out: 'Goose approval ratings: 94%. Higher than yours.' } },
  { id: 'datacentre', text: 'A tech company wants to build a huge data centre on your best hill.', a: { label: 'Take the money', fx: { money: 22, green: -8, income: 2 }, out: 'The hill now hums gently at night.' }, b: { label: 'Keep the hill', fx: { happy: 3, green: 2 }, out: 'Picnickers rejoice. Tech bros sulk.' } },
  { id: 'heatwave', text: 'A heatwave hits. Everyone is sticky and cross.', a: { label: 'Open free public pools', fx: { money: -10, happy: 6 }, out: 'Cannonball contest declared a national holiday.' }, b: { label: 'Tell people to stand in the shade', fx: { happy: -6 }, out: 'The shade is now very crowded.' } },
  { id: 'ferry', text: 'Your neighbour offers a cheap ferry link.', a: { label: 'Sign the deal', fx: { money: -14, commute: -4, cap: 100 }, out: 'New arrivals, new snacks, shorter commutes.' }, b: { label: 'We’re an island, thanks', fx: { happy: 1 }, out: 'Fiercely independent and slightly lonely.' } },
  { id: 'fourday', text: 'Citizens are demanding a four-day working week.', a: { label: 'Approve it', fx: { happy: 10, income: -3 }, out: 'Productivity mysteriously unchanged. Mondays abolished.' }, b: { label: 'Reject it', fx: { happy: -6, income: 1 }, out: 'Grumbling is now the national sport.' } },
  { id: 'influencer', text: 'A famous influencer wants to film on your beaches.', a: { label: 'Roll out the red carpet', fx: { money: 10, happy: 2, green: -2 }, out: 'Tourism spikes. So does the number of ring lights.' }, b: { label: 'Politely ignore them', fx: { happy: 1 }, out: 'They film anyway, from a boat.' } },
  { id: 'oil', text: 'Engineers have found oil under the island.', a: { label: 'Drill, baby, drill', fx: { money: 30, green: -15, happy: -3 }, out: 'Rich and slightly greasy.' }, b: { label: 'Leave it in the ground', fx: { green: 3, happy: 2 }, out: 'Future generations send a thank-you card.' } },
  { id: 'storm', text: 'A storm has flattened half the fences and one very old tree.', a: { label: 'Pay for repairs now', fx: { money: -14, happy: 2 }, out: 'Fences fixed. The tree is now a bench.' }, b: { label: 'We’ll fix it later', fx: { happy: -5, green: -2 }, out: 'Later is a long time on an island.' } },
  { id: 'seagull', text: 'Seagulls have organised. They want chips.', a: { label: 'Build a chip shop for them', fx: { money: -6, happy: 4 }, out: 'Peace in our time. Smells of vinegar.' }, b: { label: 'Install fake owls', fx: { money: -2, happy: -2 }, out: 'The gulls are not fooled. The owls are lonely.' } },
  { id: 'festival', text: 'Someone proposes a national festival of slightly odd things.', a: { label: 'Fund it', fx: { money: -10, happy: 8, income: 1 }, out: 'Highlight: competitive cloud-watching.' }, b: { label: 'Too odd', fx: { happy: -2 }, out: 'The odd things hold it in a garage anyway.' } },
  { id: 'jam', when: (s) => s.commute >= 34, text: 'A traffic jam has lasted three days. Some people have moved into their cars.', a: { label: 'Build a ring road', fx: { money: -16, commute: -6, green: -4 }, out: 'Traffic moves. It just has more places to be stuck.' }, b: { label: 'Declare it a festival', fx: { happy: 3, commute: 2 }, out: 'Car karaoke is now a recognised art form.' } },
  { id: 'smog', when: (s) => s.green <= 40, text: 'Smog warning! You can taste the air.', a: { label: 'Car-free Sundays', fx: { happy: -2, green: 9, commute: 2 }, out: 'Sundays are quiet. Lungs are grateful.' }, b: { label: 'Hand out nose pegs', fx: { happy: -6, cap: -60 }, out: 'Some citizens have quietly emigrated.' } },
  { id: 'bin', when: (s) => s.smart >= 50, text: 'The school science fair has invented a bin that sorts itself.', a: { label: 'Put one on every street', fx: { money: -8, green: 9, happy: 3 }, out: 'The bins are polite and slightly judgemental.' }, b: { label: 'Display it in the museum', fx: { smart: 3 }, out: 'It sorts the museum instead.' } },
  { id: 'boom', when: (s) => s.happy >= 72, text: 'Word’s out: your nation is lovely. People want to move here.', a: { label: 'Welcome everyone', fx: { cap: 200, commute: 4, happy: 2 }, out: 'New neighbours bring new recipes.' }, b: { label: 'Introduce a waiting list', fx: { happy: -1, money: 4 }, out: 'The waiting list has a waiting list.' } },
  { id: 'tourists', when: (s) => s.green >= 65, text: 'Tourists can’t get enough of your beaches.', a: { label: 'Charge a beach fee', fx: { money: 14, happy: -1 }, out: 'Sandcastles now come with receipts.' }, b: { label: 'Keep them free', fx: { happy: 4, green: -2 }, out: 'Everyone shares. Mostly.' } },
  { id: 'debt', when: (s) => s.money < 10, text: 'The treasury is nearly empty. A bank offers a loan.', a: { label: 'Take the loan', fx: { money: 25, income: -3 }, out: 'Money now, interest forever.' }, b: { label: 'Tighten belts', fx: { happy: -5, money: 6 }, out: 'Belts tightened. Trousers stay up.' } },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function newNation(name, seed = Math.floor(Math.random() * 2 ** 31)) {
  const s = { name: name || 'Nowhere', seed, turn: 1, money: 60, income: 0, pop: 500, cap: 800, happy: 55, green: 70, commute: 22, smart: 30, built: [], plots: [], events: [], history: [], ledger: {}, done: false, eventSeen: [] };
  s.history.push(snapshot(s));
  return s;
}
export const snapshot = (s) => ({ turn: s.turn - 1, money: Math.round(s.money), pop: Math.round(s.pop), happy: Math.round(s.happy), green: Math.round(s.green), commute: Math.round(s.commute), smart: Math.round(s.smart) });

/* Three project cards for this turn (deterministic per seed + turn). */
export function offers(s) {
  const r = rng(s.seed + s.turn * 101);
  const keys = Object.keys(PROJECTS);
  const pool = keys.slice().sort(() => r() - 0.5);
  // nudge: if smog is bad, a green option is always on the table
  if (s.green < 45 && !pool.slice(0, 3).some((k) => ['solar', 'wind', 'park', 'tram'].includes(k))) pool.splice(0, 0, 'park');
  if (s.pop >= s.cap * 0.92 && !pool.slice(0, 3).includes('houses')) pool.splice(0, 0, 'houses');
  return [...new Set(pool)].slice(0, 3);
}
export function pickEvent(s) {
  const r = rng(s.seed + s.turn * 7919);
  const ok = EVENTS.filter((e) => !s.eventSeen.includes(e.id) && (!e.when || e.when(s)));
  const conditional = ok.filter((e) => e.when);
  const list = conditional.length && r() < 0.65 ? conditional : ok;
  return list[Math.floor(r() * list.length)] || EVENTS[0];
}

function applyFx(s, fx, source) {
  for (const [k, v] of Object.entries(fx)) {
    if (k === 'cap') s.cap = Math.max(300, s.cap + v);
    else if (k === 'income') s.income += v;
    else s[k] += v;
    if (['green', 'happy', 'commute', 'money', 'smart'].includes(k)) {
      s.ledger[k] = s.ledger[k] || {};
      s.ledger[k][source] = (s.ledger[k][source] || 0) + v;
    }
  }
}

/** Build a project (or skip with null). Returns a new state. */
export function build(prev, key) {
  const s = structuredClone(prev);
  if (key) {
    const p = PROJECTS[key];
    if (s.money < p.cost) return prev;
    s.money -= p.cost;
    applyFx(s, p.fx, p.name);
    s.built.push(key);
    s.plots.push({ key, turn: s.turn });
  } else {
    s.money += 6; // saving earns a little interest
    s.ledger.money = s.ledger.money || {}; s.ledger.money['Saving up'] = (s.ledger.money['Saving up'] || 0) + 6;
  }
  return s;
}

/** Resolve the dilemma and end the turn: taxes, growth, side-effects. */
export function resolve(prev, event, choice) {
  const s = structuredClone(prev);
  const c = event[choice];
  applyFx(s, c.fx, `Event: ${event.id}`);
  s.eventSeen.push(event.id);
  s.events.push({ turn: s.turn, id: event.id, text: event.text, choice: c.label, out: c.out });
  const before = { ...s };
  // economy
  const tax = 14 + Math.round(s.pop / 110);
  s.money += tax + s.income;
  // people follow happiness, limited by housing
  const growth = Math.round(s.pop * ((s.happy - 45) / 220));
  s.pop = Math.max(150, s.pop + growth);
  let crowded = false;
  if (s.pop > s.cap) { s.pop = s.cap; s.happy -= 3; crowded = true; }
  // more people, more traffic, a bit more mess
  s.commute += Math.max(0, growth) / 160 + 0.8;
  s.green -= s.pop / 900;
  if (s.green < 35) s.happy -= 2; // smog
  if (s.commute > 40) s.happy -= 2; // traffic misery
  if (s.money < 0) s.happy -= 4; // debt collectors
  s.happy = clamp(s.happy, 0, 100); s.green = clamp(s.green, 0, 100); s.smart = clamp(s.smart, 0, 100); s.commute = clamp(s.commute, 5, 90);
  s.lastReport = { tax, income: s.income, growth, crowded, deltas: Object.fromEntries(['money', 'pop', 'happy', 'green', 'commute', 'smart'].map((k) => [k, Math.round(s[k] - prev[k])])), out: c.out };
  s.history.push(snapshot({ ...s, turn: s.turn + 1 }));
  s.turn += 1;
  if (s.turn > TURNS) s.done = true;
  void before;
  return s;
}

export function score(s) {
  return Math.max(0, Math.round(s.happy * 3 + s.green * 1.5 + s.smart * 1.2 + s.pop / 25 + s.money / 3 - s.commute * 2));
}
export function title(s) {
  const n = s.name;
  if (s.happy >= 75 && s.green >= 70) return `The Sunny Green Republic of ${n}`;
  if (s.money >= 160) return `The Suspiciously Wealthy Tax Haven of ${n}`;
  if (s.commute >= 45) return `The Traffic Kingdom of ${n}`;
  if (s.smart >= 75) return `The Very Clever Academy State of ${n}`;
  if (s.green <= 30) return `The Smoggy Industrial Duchy of ${n}`;
  if (s.happy <= 35) return `The Grumbling Commonwealth of ${n}`;
  if (s.pop >= 1800) return `The Bustling Megatown of ${n}`;
  return `The Perfectly Reasonable Nation of ${n}`;
}
const MOTTOS = ['Probably fine.', 'We have a park.', 'Mind the goose.', 'Small but loud.', 'Ask again later.', 'Now with trams.', 'Tide permitting.', 'Bigger than it looks.'];
export const motto = (s) => MOTTOS[s.seed % MOTTOS.length];

/** Plain-language consequences, from the ledger of who caused what. */
export function consequences(s) {
  const out = [];
  const top = (k, sign) => Object.entries(s.ledger[k] || {}).filter(([, v]) => (sign > 0 ? v > 0 : v < 0)).sort((a, b) => (sign > 0 ? b[1] - a[1] : a[1] - b[1]))[0];
  const EV = { goose: 'giant goose', datacentre: 'data centre', heatwave: 'heatwave', ferry: 'ferry', fourday: 'four-day week', influencer: 'influencer', oil: 'oil', storm: 'storm', seagull: 'seagull', festival: 'festival', jam: 'traffic jam', smog: 'smog', bin: 'self-sorting bin', boom: 'popularity boom', tourists: 'beach tourism', debt: 'loan' };
  const nice = (src) => (src.startsWith('Event: ') ? `your answer to the ${EV[src.slice(7)] || src.slice(7)} question` : src.toLowerCase());
  const g = top('green', -1); if (g && g[1] <= -8) out.push(`Most of your environmental damage (${g[1]} points) came from ${nice(g[0])}.`);
  const g2 = top('green', 1); if (g2 && g2[1] >= 6) out.push(`${g2[0].startsWith('Event') ? 'Your choices' : g2[0]} did the most for nature (+${g2[1]}).`);
  const h = top('happy', 1); if (h) out.push(`Happiest decision: ${nice(h[0])} (+${h[1]} happiness).`);
  const c = top('commute', -1); if (c) out.push(`Commutes got ${-c[1]} minutes shorter thanks to ${nice(c[0])}.`);
  if (s.commute >= 40) out.push('Population growth kept adding traffic. Public transport scales better than roads here.');
  if (s.pop >= s.cap) out.push('You ran out of homes, so growth stalled and people got cramped.');
  if (s.money < 0) out.push('You finished in debt, which quietly dragged happiness down every turn.');
  const m = top('money', 1); if (m && m[1] >= 15) out.push(`Biggest earner: ${nice(m[0])} (+£${m[1]}k).`);
  return out.slice(0, 6);
}

/* A random flag for the nation. */
export function flagFor(seed) {
  const r = rng(seed * 31 + 7);
  const palette = ['#e63946', '#f1faee', '#1d3557', '#2a9d8f', '#e9c46a', '#f4a261', '#264653', '#ffb703', '#8338ec', '#06d6a0', '#ef476f', '#118ab2'];
  const pick = () => palette[Math.floor(r() * palette.length)];
  const a = pick(); let b = pick(); while (b === a) b = pick(); let c = pick(); while (c === a || c === b) c = pick();
  return { layout: ['h', 'v', 'diag', 'cross', 'circle'][Math.floor(r() * 5)], a, b, c, emblem: ['star', 'circle', 'goose', 'wave', 'none'][Math.floor(r() * 5)] };
}
