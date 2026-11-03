/* Default data. Inserted once with "on conflict do nothing", so admin edits are never overwritten. */
import crypto from 'node:crypto';
import { q, one } from './db.js';

export const DEFAULT_CONFIG = {
  monetization_enabled: false, // global ads switch. Stays OFF until an admin turns it on.
  site: { contact_email: '', kofi_url: '', kofi_manage_url: 'https://ko-fi.com/', coffee_amounts: [3, 5, 10], milestones: [10000, 50000, 100000, 500000] },
};
const TIERS = [
  ['free', 'Free', 0, 0, ['Every game, always free', 'A profile with free titles and colours', 'Your own play stats'], null],
  ['supporter', 'Supporter', 1, 200, ['Supporter badge', 'The Supporter Vault: titles, colours, themes, decorations', 'Your name in the credits (if you want)', 'Supporter dev notes'], 'Supporter'],
  ['super', 'Super Supporter', 2, 500, ['Everything in Supporter', 'Animated Super badge', 'Extra titles, themes and decorations', 'Detailed stats and activity chart', 'Early looks at some experiments'], 'Super Supporter'],
  ['ultimate', 'Ultimate Supporter', 3, 1000, ['Everything in Super', 'Unique Ultimate badge', 'The full title collection', 'Gold theme and extra cosmetics', 'Selected development updates'], 'Ultimate Supporter'],
];
// [id, name, category, kind, description, min_tier, keep, collection, data, available]
const P = [
  // free
  ['title-newcomer', 'Newcomer', 'titles', 'title', 'Everyone starts somewhere.', null, true, null, { text: 'Newcomer' }, true],
  ['title-casual', 'Casual Clicker', 'titles', 'title', 'Here for a good time, not a long time.', null, true, null, { text: 'Casual Clicker' }, true],
  ['theme-plain', 'Plain', 'themes', 'theme', 'White page, black ink. The default.', null, true, null, { theme: 'paper' }, true],
  ['theme-night', 'Night', 'themes', 'theme', 'For playing after bedtime.', null, true, null, { theme: 'midnight' }, true],
  ['accent-tomato', 'Tomato', 'accents', 'accent', 'A sensible red.', null, true, null, { color: '#ff4d2e' }, true],
  ['accent-sea', 'Sea', 'accents', 'accent', 'Calm and blue.', null, true, null, { color: '#1e88e5' }, true],
  ['accent-moss', 'Moss', 'accents', 'accent', 'Quietly green.', null, true, null, { color: '#2e9d57' }, true],
  ['accent-ink', 'Ink', 'accents', 'accent', 'Basically black.', null, true, null, { color: '#141414' }, true],
  // supporter titles (yours to keep once unlocked)
  ['title-certified', 'Certified Oddball', 'titles', 'title', 'Officially odd.', 'supporter', true, null, { text: 'Certified Oddball' }, true],
  ['title-timewaster', 'Professional Time Waster', 'titles', 'title', 'Has a CV for this.', 'supporter', true, null, { text: 'Professional Time Waster' }, true],
  ['title-explorer', 'Internet Explorer', 'titles', 'title', 'Not the browser. Probably.', 'supporter', true, null, { text: 'Internet Explorer' }, true],
  ['title-questionable', 'Questionable Decisions', 'titles', 'title', 'Bought a goose a chip shop.', 'supporter', true, null, { text: 'Questionable Decisions' }, true],
  ['title-chaos', 'Chaos Enthusiast', 'titles', 'title', 'Survived the pop-ups. Wants more.', 'supporter', true, null, { text: 'Chaos Enthusiast' }, true],
  ['title-curious', 'Terminally Curious', 'titles', 'title', 'Clicks every button.', 'supporter', true, null, { text: 'Terminally Curious' }, true],
  ['title-survivor', 'Experiment Survivor', 'titles', 'title', 'Made it out of the lab.', 'super', true, null, { text: 'Experiment Survivor' }, true],
  ['title-unusual', 'The Unusual One', 'titles', 'title', 'Even here, a bit much.', 'super', true, null, { text: 'The Unusual One' }, true],
  ['title-clicker', 'Certified Clicker', 'titles', 'title', 'Fingers of steel.', 'super', true, null, { text: 'Certified Clicker' }, true],
  ['title-reality', 'Reality Tester', 'titles', 'title', 'Checks if things are real by clicking them.', 'super', true, null, { text: 'Reality Tester' }, true],
  ['title-architect', 'The Architect', 'titles', 'title', 'Built a tiny nation. Regrets nothing.', 'ultimate', true, null, { text: 'The Architect' }, true],
  ['title-menace', 'Digital Menace', 'titles', 'title', 'The pop-ups are scared of you.', 'ultimate', true, null, { text: 'Digital Menace' }, true],
  // badges
  ['badge-classic', 'Classic Supporter', 'badges', 'badge', 'Shows you’re a supporter right now.', 'supporter', false, null, { icon: 'heart', color: '#ff4d2e' }, true],
  ['badge-early', 'Early Supporter', 'badges', 'badge', 'For people who turned up early. Yours to keep.', 'supporter', true, 'Early days', { icon: 'sprout', color: '#2e9d57' }, true],
  ['badge-og', 'OG Member', 'badges', 'badge', 'You were here before it was cool.', 'supporter', true, 'Early days', { icon: 'og', color: '#141414' }, true],
  ['badge-super', 'Super Supporter', 'badges', 'badge', 'Animated. Slightly smug.', 'super', false, null, { icon: 'bolt', color: '#ffb703', animated: true }, true],
  ['badge-experimentalist', 'Experimentalist', 'badges', 'badge', 'Has opinions about test tubes.', 'super', false, null, { icon: 'flask', color: '#8f6cff' }, true],
  ['badge-ultimate', 'Ultimate Supporter', 'badges', 'badge', 'The big one. Animated.', 'ultimate', false, null, { icon: 'crown', color: '#d4a017', animated: true }, true],
  ['badge-collector', 'Collector', 'badges', 'badge', 'Has unlocked a suspicious amount of things.', 'ultimate', false, null, { icon: 'gem', color: '#06b6d4' }, true],
  // themes (site themes; need an active membership)
  ['theme-terminal', 'Terminal', 'themes', 'theme', 'Green text on black. Hacker voice optional.', 'supporter', false, null, { theme: 'terminal' }, true],
  ['theme-retro', 'Retro', 'themes', 'theme', 'Beige plastic and warm brown.', 'supporter', false, null, { theme: 'retro' }, true],
  ['theme-paper', 'Paper', 'themes', 'theme', 'Notebook paper and pencil grey.', 'supporter', false, null, { theme: 'notebook' }, true],
  ['theme-neon', 'Neon', 'themes', 'theme', 'Pink and cyan, very late at night.', 'super', false, null, { theme: 'neon' }, true],
  ['theme-mono', 'Monochrome', 'themes', 'theme', 'True black. Your OLED screen will thank you.', 'super', false, null, { theme: 'mono' }, true],
  ['theme-gold', 'Gold Leaf', 'themes', 'theme', 'Tasteful. Mostly.', 'ultimate', false, null, { theme: 'gold' }, true],
  // decorations
  ['deco-dashed', 'Dashed border', 'decorations', 'decoration', 'A cut-out-and-keep profile.', 'supporter', false, null, { border: 'dashed' }, true],
  ['deco-stamp', 'Stamp border', 'decorations', 'decoration', 'Perforated edges, like a stamp.', 'supporter', false, null, { border: 'stamp' }, true],
  ['deco-dots', 'Dot pattern', 'decorations', 'decoration', 'Polka dots behind your name.', 'supporter', false, null, { pattern: 'dots' }, true],
  ['deco-glow', 'Glow border', 'decorations', 'decoration', 'Your profile, but glowing.', 'super', false, null, { border: 'glow' }, true],
  ['deco-pixel', 'Pixel border', 'decorations', 'decoration', 'Chunky 8-bit edges.', 'super', false, null, { border: 'pixel' }, true],
  ['deco-stripes', 'Stripes', 'decorations', 'decoration', 'Diagonal stripes behind your name.', 'super', false, null, { pattern: 'stripes' }, true],
  ['deco-gold', 'Gold frame', 'decorations', 'decoration', 'A double gold frame and header.', 'ultimate', false, null, { border: 'gold', pattern: 'grid' }, true],
  // accents
  ['accent-pink', 'Hot pink', 'accents', 'accent', 'Loud.', 'supporter', false, null, { color: '#ff2bd6' }, true],
  ['accent-teal', 'Teal', 'accents', 'accent', 'Fancy blue-green.', 'supporter', false, null, { color: '#14b8a6' }, true],
  ['accent-violet', 'Violet', 'accents', 'accent', 'Dramatic purple.', 'super', false, null, { color: '#7c3aed' }, true],
  ['accent-gold', 'Gold', 'accents', 'accent', 'Shiny.', 'ultimate', false, null, { color: '#d4a017' }, true],
  // cursor trails
  ['trail-sparkle', 'Sparkle trail', 'trails', 'trail', 'Little stars follow your mouse.', 'supporter', false, null, { trail: 'sparkle' }, true],
  ['trail-comet', 'Comet trail', 'trails', 'trail', 'A rainbow tail.', 'super', false, null, { trail: 'comet' }, true],
  ['trail-confetti', 'Confetti trail', 'trails', 'trail', 'A small party, everywhere you point.', 'ultimate', false, null, { trail: 'confetti' }, true],
  // seasonal collections (no countdowns; admins switch them on and off)
  ['trail-snow', 'Snowfall trail', 'specials', 'trail', 'Part of the Winter collection.', 'supporter', false, 'Winter', { trail: 'snow' }, true],
  ['title-frostbitten', 'Frostbitten', 'specials', 'title', 'Part of the Winter collection.', 'supporter', true, 'Winter', { text: 'Frostbitten' }, true],
  ['badge-pumpkin', 'Pumpkin', 'specials', 'badge', 'Part of the Halloween collection. Back next October.', 'supporter', true, 'Halloween', { icon: 'pumpkin', color: '#f97316' }, false],
  ['badge-year-one', 'Year One', 'specials', 'badge', 'For oddball’s first birthday.', 'supporter', true, 'Anniversary', { icon: 'cake', color: '#e11d48' }, false],
  // milestones (unlock only when the real visit counter reaches the number)
  ['badge-10k', '10k Club', 'specials', 'badge', 'Unlocks for supporters when oddball reaches 10,000 home page visits.', 'supporter', true, 'Milestones', { icon: 'trophy', color: '#16a34a', milestone: 10000 }, true],
  ['badge-100k', '100k Club', 'specials', 'badge', 'Unlocks for supporters when oddball reaches 100,000 home page visits.', 'supporter', true, 'Milestones', { icon: 'trophy', color: '#d4a017', milestone: 100000 }, true],
];
const PLACEMENTS = [
  ['footer', 'Footer advertisement', 'banner', 468, 60, 'A small labelled ad at the bottom of the home page.'],
  ['home_sponsor', 'Home page sponsor line', 'sponsor_line', null, null, 'One line under the tagline: “oddball is supported by …”.'],
  ['sponsored_card', 'Sponsored game card', 'card', null, null, 'An extra entry in the games list, clearly labelled Sponsored.'],
  ['gotw', 'Game of the Week', 'feature', null, null, 'A small featured game. Only labelled sponsored when it is.'],
  ['game_sponsor', 'Sponsored experiment', 'game_line', null, null, 'A one-line “supported by” note on a game’s start screen, outside the play area.'],
];
const svg = (bg, fg, text, sub) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${bg}"/><circle cx="260" cy="40" r="70" fill="${fg}" opacity=".25"/><text x="22" y="110" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${fg}">${text}</text><text x="24" y="142" font-family="Arial, sans-serif" font-size="16" fill="${fg}" opacity=".8">${sub}</text></svg>`);
const SAMPLES = [
  { placement: 'footer', title: 'Pixelmancer', body: 'Draw tiny pixel art in your browser. Free to try.', image: svg('#1f2a44', '#ffd166', 'Pixelmancer', 'tiny pixel art'), dest: 'https://example.com/pixelmancer', label: 'Advertisement' },
  { placement: 'home_sponsor', title: 'Moth & Lamp Studio', body: 'Moth & Lamp Studio', dest: 'https://example.com/moth-and-lamp', label: 'Sponsor' },
  { placement: 'sponsored_card', title: 'Ant Farm Simulator', body: 'Dig tunnels. Lose ants. A sponsored game from Antworks.', image: svg('#3d2b1f', '#f4c27a', 'Ant Farm', 'by Antworks'), dest: 'https://example.com/ant-farm', label: 'Sponsored' },
  { placement: 'gotw', title: 'Tiny Nation', body: 'This week: can you build a country nobody complains about?', game: 'tiny-nation', dest: null, label: 'Game of the week', sponsored: false },
  { placement: 'game_sponsor', title: 'Stapleworks', body: 'Stapleworks', game: 'normal-form', dest: 'https://example.com/stapleworks', label: 'Supported by' },
];

export async function seed() {
  for (const [k, v] of Object.entries(DEFAULT_CONFIG)) await q('insert into config (key, value) values ($1, $2) on conflict (key) do nothing', [k, JSON.stringify(v)]);
  for (const [id, name, rank, price, perks, ref] of TIERS) await q('insert into tiers (id, name, rank, price_cents, perks, provider_ref) values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing', [id, name, rank, price, JSON.stringify(perks), ref]);
  let sort = 0;
  for (const [id, name, cat, kind, desc, tier, keep, coll, data, avail] of P) {
    await q('insert into products (id, name, category, kind, description, min_tier, keep, collection, data, available, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (id) do nothing', [id, name, cat, kind, desc, tier, keep, coll, JSON.stringify(data), avail, sort++]);
  }
  for (const [id, name, type, w, h, desc] of PLACEMENTS) await q('insert into placements (id, name, type, width, height, description) values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing', [id, name, type, w, h, desc]);
  if (!(await one('select 1 from config where key = $1', ['samples_seeded']))) {
    for (const s of SAMPLES) {
      await q(`insert into campaigns (id, placement_id, status, title, body, image, dest_url, label, game_slug, sponsored, sample) values ($1,$2,'preview',$3,$4,$5,$6,$7,$8,$9,true)`,
        [crypto.randomUUID(), s.placement, s.title, s.body, s.image || null, s.dest, s.label, s.game || null, s.sponsored !== false]);
    }
    await q(`insert into newsletter_issues (id, subject, sponsor_name, sponsor_text, sponsor_url, notes) values ($1, 'Issue #1: two new games', 'Moth & Lamp Studio', 'Handmade desk lamps for people who stay up too late.', 'https://example.com/moth-and-lamp', 'Sample issue for previewing the sponsor block.')`, [crypto.randomUUID()]);
    await q(`insert into config (key, value) values ('samples_seeded', 'true')`);
  }
}
