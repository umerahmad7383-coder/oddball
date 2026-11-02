import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useRoom } from '../../../platform/client/useRoom.js';
import { GAME_ID } from '../shared/rules.js';
import { BY_ID } from '../shared/players.js';
import { Sound } from './components.jsx';
import { Landing, Lobby } from './Front.jsx';
import { Auction } from './Auction.jsx';
import { Tactics, Results } from './Squad.jsx';

const MUTE_KEY = 'oddball.dd.muted';

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
  useEffect(() => { if (lotN) Sound.play('reveal'); }, [lotN]);

  const inGame = r.room && r.room.phase === 'game' && st && st.phase !== 'results';
  const toggleMute = () => { const m = !muted; setMuted(m); try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) { /* ignore */ } if (!m) Sound.init(); };

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
        <span className="dd-mark">Deadline Day{r.room ? <em>{r.room.code}</em> : null}</span>
        <span className="bar-right">
          <span className={`conn c-${r.conn}`} title={r.conn}>{r.conn === 'open' ? <Wifi size={16} /> : <WifiOff size={16} />}</span>
          <button className="icon-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </span>
      </header>
      <main className="dd-main">{view}</main>
    </div>
  );
}
