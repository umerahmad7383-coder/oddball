import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useRoom } from '../../../platform/client/useRoom.js';
import { GAME_ID, fmtM } from '../shared/rules.js';
import { BY_ID } from '../shared/players.js';
import { Sound, Ticker } from './ui.jsx';
import { Landing, Lobby } from './Front.jsx';
import { Auction } from './Auction.jsx';
import { Tactics, Results } from './Squad.jsx';

const MUTE_KEY = 'oddball.dd.muted';
const IDLE_NEWS = ['TRANSFER WINDOW SLAMS SHUT TONIGHT', '£500M BUDGETS CONFIRMED FOR EVERY MANAGER', 'AGENTS SPOTTED IN HOTEL LOBBIES', 'FAX MACHINES ON STANDBY', 'PLAYERS SEEN WITH SUITCASES AT TRAINING GROUND'];

export default function App() {
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; } });
  Sound.muted = muted;
  const meRef = useRef(null);
  const r = useRoom(GAME_ID, {
    onEvent: (ev) => {
      if (ev.type === 'bid' && ev.pid !== meRef.current) Sound.play('bid');
      if (ev.type === 'sold') Sound.play(ev.pid === meRef.current ? 'won' : 'gavel');
      if (ev.type === 'unsold') Sound.play('unsold');
      if (ev.type === 'tactics' || ev.type === 'results') Sound.play('whistle');
    },
  });
  meRef.current = r.meId;
  const st = r.room && r.room.state;
  const academyKey = st ? Object.keys(st.academy || {}).join(',') : '';
  const lookup = useMemo(() => { const extra = (st && st.academy) || {}; return (id) => BY_ID[id] || extra[id] || null; }, [academyKey]);
  const lotN = st && st.lot ? st.lot.n : 0;
  useEffect(() => { if (lotN) Sound.play(BY_ID[st.lot.id] && BY_ID[st.lot.id].rating >= 88 ? 'breaking' : 'reveal'); }, [lotN]);

  const inGame = r.room && r.room.phase === 'game' && st && st.phase !== 'results';
  const toggleMute = () => { const m = !muted; setMuted(m); try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) { /* ignore */ } if (!m) Sound.init(); };

  // the rolling news strip
  const news = useMemo(() => {
    if (!st) return IDLE_NEWS;
    const names = Object.fromEntries(r.room.players.map((p) => [p.id, p.name]));
    const out = [];
    if (st.lot && BY_ID[st.lot.id]) out.push(`LOT ${st.lot.n}: ${BY_ID[st.lot.id].name.toUpperCase()} IS UP FOR GRABS`);
    for (const h of st.history.slice(0, 8)) { const f = lookup(h.id); if (f) out.push(`DONE DEAL: ${f.name.toUpperCase()} JOINS ${String(names[h.pid] || '?').toUpperCase()} FOR ${fmtM(h.price)}`); }
    if (st.phase === 'tactics') out.unshift('WINDOW CLOSED. MANAGERS PICKING THEIR XI');
    if (st.phase === 'results' && st.results && st.results[0]) out.unshift(`${st.results[0].name.toUpperCase()} WINS DEADLINE DAY`);
    return out.length ? out : IDLE_NEWS;
  }, [st && st.history.length, st && st.lot && st.lot.n, st && st.phase, academyKey]);

  let view;
  if (!r.room || !r.me) view = <Landing r={r} />;
  else if (r.room.phase === 'lobby') view = <Lobby r={r} />;
  else if (!st) view = null;
  else if (st.phase === 'auction') view = <Auction r={r} lookup={lookup} />;
  else if (st.phase === 'tactics') view = <Tactics r={r} lookup={lookup} />;
  else view = <Results r={r} lookup={lookup} />;

  return (
    <div className="dd">
      <header className="dd-bar">
        <a className="back" href="/" onClick={(e) => { if (inGame && !window.confirm('Leave the auction? You can come back with the same tab while it’s running.')) e.preventDefault(); }}><ArrowLeft size={18} /> oddball</a>
        <span className="dd-mark"><span>DEADLINE</span><span>DAY</span>{r.room ? <em>{r.room.code}</em> : null}</span>
        <span className="bar-right">
          <span className={`conn c-${r.conn}`} title={r.conn}>{r.conn === 'open' ? <Wifi size={16} /> : <WifiOff size={16} />}</span>
          <button className="icon-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </span>
      </header>
      <Ticker items={news} />
      <main className="dd-main">{view}</main>
      {r.feed.length > 0 && <div className="feed">{r.feed.slice(-2).map((x) => <div key={x.id}>{x.text}</div>)}</div>}
    </div>
  );
}
