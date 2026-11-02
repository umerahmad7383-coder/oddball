/* Every game the server knows about. Adding a game = one import + one line here. */
import { antiScamServer } from '../../games/anti-scam/server/index.js';
import { createDeadlineDayServer } from '../../games/deadline-day/server/index.js';

/** Multiplayer servers, keyed by game id (served at /ws/<id>). Single-player games don't need one. */
export const GAME_SERVERS = {
  'anti-scam': antiScamServer,
  'deadline-day': createDeadlineDayServer(),
};
/** Folders under dist/ that are game pages (dist/<id>/index.html). */
export const PAGES = ['anti-scam', 'deadline-day', 'normal-form', 'tiny-nation'];
