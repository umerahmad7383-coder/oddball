import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, GAME_LEN, GLOBAL_EVENTS, cleanName } from '../../shared/rules.js';
import { fmtMoney, fmtTime, Sound } from '../game/core.js';
import { Icon } from '../game/ui.jsx';
import { Game, snapKey } from '../game/Game.jsx';
import { Screen, SoundToggle } from '../screens.jsx';
import { Net, wsUrl } from './net.js';
import { PlayerRows, EmoteBar, SpectateView, ACTIVE, STATUS_LABEL } from './MpDock.jsx';

const CONN_LABEL = { idle: 'Offline', connecting: 'Connecting…', open: 'Connected', reconnecting: 'Reconnecting…', closed: 'Offline' };
const inviteLink = (code) => `${window.location.origin}${window.location.pathname}?join=${code}`;
function setUrlCode(code) {
  try {
    const u = new URL(window.location.href);
    if (code) u.searchParams.set('join', code); else u.searchParams.delete('join');
    window.history.replaceState(null, '', u.toString());
  } catch (e) { /* ignore */ }
}

export function OnlineHub({ initialCode, defaultName, onExit, muted, onToggleMute, onRecord }) {
  const netRef = useRef(null); if (!netRef.current) netRef.current = new Net(wsUrl());
  const net = netRef.current;
  const [conn, setConn] = useState('idle');
  const [room, setRoom] = useState(null);
  const roomRef = useRef(null); roomRef.current = room;
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState('');
  const [doneGame, setDoneGame] = useState(null); // game id whose local desktop has ended
  const [snap, setSnap] = useState(null);
  const [lobbyEmotes, setLobbyEmotes] = useState([]);
  const [lobbyFeed, setLobbyFeed] = useState([]);
  const recorded = useRef(new Set());
  const started = useRef(null);
  const spectating = useRef(null);
  const [resolved, setResolved] = useState(false); // first hello answered

  useEffect(() => {
    const offs = [
      net.on('status', (m) => setConn(m.status)),
      net.on('joined', (m) => { setMeId(m.pid); setError(''); setUrlCode(m.code); setResolved(true); }),
      net.on('room', (m) => setRoom(m.room)),
      net.on('stats', (m) => setRoom((r) => (r ? { ...r, players: r.players.map((p) => { const u = m.players.find((x) => x.id === p.id); return u ? { ...p, ...u } : p; }) } : r))),
      net.on('noroom', () => { setResolved(true); if (roomRef.current) setError('That room has closed. The server may have restarted.'); setRoom(null); setMeId(null); setUrlCode(null); }),
      net.on('left', () => { setRoom(null); setMeId(null); setUrlCode(null); }),
      net.on('error', (m) => { if (m.code !== 'power') { setError(m.msg); Sound.play('error'); } }),
      net.on('snap', (m) => { if (m.from === spectating.current) setSnap(m.snap); }),
      net.on('emote', (m) => setLobbyEmotes((l) => [...l.slice(-8), { id: Math.random(), ...m, x: 10 + Math.random() * 80 }])),
      net.on('feed', (m) => setLobbyFeed((l) => [...l.slice(-5), { id: Math.random(), ...m }])),
    ];
    net.connect();
    return () => { offs.forEach((o) => o()); net.close(); };
  }, []);
  useEffect(() => { if (lobbyEmotes.length) { const t = setTimeout(() => setLobbyEmotes((l) => l.slice(1)), 2400); return () => clearTimeout(t); } return undefined; }, [lobbyEmotes]);

  const me = room && room.players.find((p) => p.id === meId);
  const g = room && room.game;

  /* record finished online games in the local leaderboard once */
  useEffect(() => {
    if (!room || room.phase !== 'results' || !room.results || recorded.current.has(room.results.gameId)) return;
    recorded.current.add(room.results.gameId);
    const r = room.results, row = r.players.find((p) => p.id === meId);
    if (!row) return;
    if (r.mode === 'coop') onRecord({ name: row.name, score: r.score, survival: r.survival, money: Math.round(r.money / Math.max(1, r.n)), defeated: row.defeated, won: r.won, mode: 'Co-op' });
    else onRecord({ name: row.name, score: row.score, survival: row.survival, money: row.money, defeated: row.defeated, won: row.status === 'survived', mode: 'Online' });
    try { sessionStorage.removeItem(snapKey(r.gameId)); } catch (e) { /* ignore */ }
  }, [room]);

  const exit = () => { if (room) net.send({ t: 'leave' }); setUrlCode(null); setTimeout(onExit, 60); };

  /* the live game object is created once per game id */
  const online = useMemo(() => {
    if (!g || !me) return null;
    let restore = null;
    try { const raw = sessionStorage.getItem(snapKey(g.id)); if (raw) restore = JSON.parse(raw); } catch (e) { /* ignore */ }
    return {
      net, mode: g.mode, gameId: g.id, seed: g.seed, startAt: g.startAt, n: g.n, meId, pool: g.pool, restore,
      seedStats: restore ? null : me.stats, getRoom: () => roomRef.current,
      onFinal: (result) => net.send({ t: 'final', result }),
    };
  }, [g && g.id, meId]);

  let body;
  if (!room || !me) {
    body = <Entry net={net} conn={conn} error={error} setError={setError} initialCode={initialCode} defaultName={defaultName} onBack={exit} waiting={!resolved && !!initialCode} />;
  } else if (room.phase === 'lobby') {
    body = <Lobby room={room} me={me} net={net} conn={conn} error={error} onLeave={exit} emotes={lobbyEmotes} feed={lobbyFeed} />;
  } else if (g && online && doneGame !== g.id && ((room.phase === 'playing' && me.status === 'playing') || (started.current === g.id && room.phase !== 'lobby'))) {
    started.current = g.id;
    return <Game key={g.id} player={me.name} online={online} muted={muted} onToggleMute={onToggleMute} matchLabel={g.mode === 'coop' ? 'Co-op' : 'Versus'} onEnd={() => setDoneGame(g.id)} />;
  } else if (room.phase === 'playing') {
    body = <Watch room={room} me={me} net={net} conn={conn} snap={snap} setSnap={setSnap} spectating={spectating} onLeave={exit} emotes={lobbyEmotes} feed={lobbyFeed} />;
  } else {
    body = <OnlineResults room={room} me={me} net={net} onLeave={exit} emotes={lobbyEmotes} />;
  }
  return (
    <Screen className="online">
      <SoundToggle muted={muted} onToggleMute={onToggleMute} />
      <div className={`conn-pill c-${conn}`}><Icon name={conn === 'open' ? 'Wifi' : 'WifiOff'} size={13} /> {CONN_LABEL[conn] || conn}</div>
      {body}
    </Screen>
  );
}

function Entry({ net, conn, error, setError, initialCode, defaultName, onBack, waiting }) {
  const [name, setName] = useState(defaultName || '');
  const [code, setCode] = useState((initialCode || '').toUpperCase());
  const ok = conn === 'open';
  const create = () => { setError(''); net.send({ t: 'create', name: cleanName(name, 'Host') }); Sound.init(); };
  const join = () => { const c = code.trim().toUpperCase(); if (c.length !== 6) { setError('Room codes are 6 characters, like K7QX2M.'); return; } setError(''); net.send({ t: 'join', code: c, name: cleanName(name, 'Player') }); Sound.init(); };
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <h1 className="logo small"><span>PLAY</span><span>ONLINE</span></h1>
      <p className="tagline">Up to 4 friends, separate computers, one round of synchronized chaos.</p>
      <div className="xp-dialog panel-box">
        <div className="xptitle static"><Icon name="Globe" size={14} /> online_lobby.exe</div>
        <div className="menu-body flex flex-col gap-3 p-4">
          {waiting && <p className="lead flex items-center gap-2"><Icon name="Loader2" size={14} className="spin" /> Checking for your room…</p>}
          <label className="field"><span>Your name</span>
            <input value={name} maxLength={16} placeholder="Player" onChange={(e) => setName(e.target.value)} />
          </label>
          {initialCode ? null : <button className="arc-btn big" disabled={!ok} onClick={create}><Icon name="UserPlus" size={18} /> Create a room</button>}
          <div className="join-row">
            <label className="field grow"><span>Room code</span>
              <input className="code-input" value={code} maxLength={6} placeholder="K7QX2M" autoCapitalize="characters" spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
            </label>
            <button className={`arc-btn ${initialCode ? '' : 'ghost'}`} disabled={!ok} onClick={join}><Icon name="Link" size={16} /> Join</button>
          </div>
          {error && <p className="form-error"><Icon name="AlertTriangle" size={14} /> {error}</p>}
          {!ok && <p className="lead flex items-center gap-2"><Icon name="Loader2" size={14} className="spin" /> {conn === 'reconnecting' ? 'Can’t reach the game server. Retrying…' : 'Connecting to the game server…'}</p>}
          <div className="menu-row"><button className="arc-btn ghost" onClick={onBack}><Icon name="ChevronLeft" size={16} /> Main menu</button></div>
        </div>
      </div>
    </div>
  );
}

function FloatingEmotes({ emotes }) {
  return <div className="lobby-emotes" aria-hidden="true">{emotes.map((m) => <div key={m.id} className="emote-float" style={{ left: `${m.x}%` }}><span>{m.e}</span><small style={{ background: m.color }}>{m.name}</small></div>)}</div>;
}

function Lobby({ room, me, net, error, onLeave, emotes, feed }) {
  const [copied, setCopied] = useState('');
  const isHost = room.hostId === me.id;
  const active = room.players.filter((p) => p.status !== 'left');
  const connected = active.filter((p) => p.connected);
  const notReady = connected.filter((p) => p.id !== room.hostId && !p.ready);
  const why = connected.length < MIN_PLAYERS ? `Waiting for at least ${MIN_PLAYERS} players. Share the code!` : notReady.length ? `Waiting for ${notReady.map((p) => p.name).join(', ')} to ready up.` : '';
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); Sound.play('click'); setTimeout(() => setCopied(''), 1800); } catch (e) { setCopied('fail'); }
  };
  const share = async () => {
    const url = inviteLink(room.code);
    if (navigator.share) { try { await navigator.share({ title: 'Anti-Scam Arcade', text: `Join my Anti-Scam Arcade room ${room.code}`, url }); return; } catch (e) { /* cancelled */ } }
    copy(url, 'link');
  };
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => active[i] || null);
  return (
    <div className="lobby">
      <FloatingEmotes emotes={emotes} />
      <div className="lobby-code">
        <small>Room code</small>
        <b>{room.code.split('').map((c, i) => <span key={i}>{c}</span>)}</b>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="arc-btn ghost sm" onClick={() => copy(room.code, 'code')}><Icon name={copied === 'code' ? 'Check' : 'Copy'} size={14} /> {copied === 'code' ? 'Copied' : 'Copy code'}</button>
          <button className="arc-btn ghost sm" onClick={share}><Icon name={copied === 'link' ? 'Check' : 'Share2'} size={14} /> {copied === 'link' ? 'Link copied' : 'Invite link'}</button>
        </div>
        {copied === 'fail' && <small className="form-error">Couldn’t copy. Invite link: {inviteLink(room.code)}</small>}
      </div>

      <div className="xp-dialog lobby-box">
        <div className="xptitle static"><Icon name="Users" size={14} /> Lobby — {active.length}/{MAX_PLAYERS} players</div>
        <div className="lobby-body">
          <div className="modes">
            {[['versus', 'Versus', 'Swords', 'Everyone for themselves. Same waves, sabotage your friends, top score wins.'], ['coop', 'Co-op', 'Users', 'One shared bank and CPU. Keep the PC alive together for 3 minutes.']].map(([k, label, ic, desc]) => (
              <button key={k} className={`mode ${room.mode === k ? 'on' : ''}`} disabled={!isHost} onClick={() => net.send({ t: 'mode', mode: k })}>
                <Icon name={ic} size={20} /><b>{label}</b><span>{desc}</span>
              </button>
            ))}
          </div>
          {!isHost && <small className="muted-note">The host picks the mode.</small>}
          <div className="slots">
            {slots.map((p, i) => p ? (
              <div key={p.id} className={`slot ${p.id === me.id ? 'me' : ''} ${p.connected ? '' : 'off'}`} style={{ '--pc': p.color }}>
                <div className="slot-av"><Icon name={room.hostId === p.id ? 'Crown' : 'Gamepad2'} size={22} /></div>
                <div className="slot-name">{p.name}{p.id === me.id ? ' (you)' : ''}</div>
                <div className="slot-state">
                  {!p.connected ? <><Icon name="WifiOff" size={12} /> Reconnecting</>
                    : room.hostId === p.id ? <><Icon name="Crown" size={12} /> Host</>
                      : p.ready ? <><Icon name="Check" size={12} /> Ready</> : 'Not ready'}
                </div>
              </div>
            ) : <div key={`e${i}`} className="slot empty"><Icon name="UserPlus" size={20} /><span>Open slot</span></div>)}
          </div>
          {error && <p className="form-error"><Icon name="AlertTriangle" size={14} /> {error}</p>}
          <div className="lobby-actions">
            {isHost ? (
              <button className="arc-btn big" disabled={!!why} onClick={() => net.send({ t: 'start' })}><Icon name="Play" size={18} /> Start {room.mode === 'coop' ? 'co-op' : 'versus'}</button>
            ) : (
              <button className={`arc-btn big ${me.ready ? 'ghost' : ''}`} onClick={() => { net.send({ t: 'ready', ready: !me.ready }); Sound.play('click'); }}>
                <Icon name={me.ready ? 'Check' : 'Hourglass'} size={18} /> {me.ready ? 'Ready! (tap to cancel)' : 'Ready up'}
              </button>
            )}
            <button className="arc-btn ghost" onClick={onLeave}><Icon name="LogOut" size={16} /> Leave room</button>
          </div>
          <p className="muted-note">{why || (isHost ? 'Everyone’s ready. Start when you are!' : 'Waiting for the host to start.')}</p>
          <EmoteBar net={net} />
          {feed.length > 0 && <div className="lobby-feed">{feed.slice(-3).map((f) => <div key={f.id}>{f.text}</div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function useCountdown(startAt, net) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, []);
  return Math.max(0, GAME_LEN - (net.now() - startAt) / 1000);
}

function Watch({ room, me, net, snap, setSnap, spectating, onLeave, emotes, feed }) {
  const alive = room.players.filter((p) => p.status === 'playing' && p.id !== me.id);
  const [target, setTarget] = useState(null);
  const left = useCountdown(room.game.startAt, net);
  const current = alive.find((p) => p.id === target) || alive[0] || null;
  useEffect(() => {
    const id = current ? current.id : null;
    if (spectating.current !== id) { spectating.current = id; setSnap(null); net.send({ t: 'spectate', target: id }); }
  }, [current && current.id]);
  useEffect(() => () => { spectating.current = null; net.send({ t: 'spectate', target: null }); }, []);
  const coop = room.game.mode === 'coop';
  const title = me.status === 'survived' ? 'You survived! Waiting for the others…' : me.status === 'spectator' ? 'Spectating — you’ll play next round' : coop ? 'You left the team' : 'You’re out!';
  return (
    <div className="watch">
      <FloatingEmotes emotes={emotes} />
      <div className="watch-head">
        <div><div className="watch-title">{title}</div><small>{fmtTime(left)} left in the round</small></div>
        <button className="arc-btn ghost sm" onClick={onLeave}><Icon name="LogOut" size={14} /> Leave room</button>
      </div>
      <div className="watch-grid">
        <div className="watch-main">
          <div className="watch-tabs">
            {alive.length === 0 ? <span className="muted-note">Nobody left to watch. Results are on the way…</span>
              : alive.map((p) => <button key={p.id} className={current && current.id === p.id ? 'on' : ''} style={{ '--pc': p.color }} onClick={() => setTarget(p.id)}><Icon name="Eye" size={13} /> {p.name}</button>)}
          </div>
          {current && <SpectateView snap={snap} player={current} />}
        </div>
        <div className="watch-side xp-dialog">
          <div className="xptitle static"><Icon name="Radio" size={14} /> {coop ? 'Team' : 'Live standings'}</div>
          <div className="p-2"><PlayerRows room={room} meId={me.id} coop={coop} /></div>
          {coop && room.game.pool && <div className="px-3 pb-2 text-xs">Shared bank and CPU are shown on each player’s screen.</div>}
          <div className="p-2"><EmoteBar net={net} /></div>
          {feed.length > 0 && <div className="lobby-feed p-2">{feed.slice(-5).map((f) => <div key={f.id}>{f.text}</div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function awards(rows, coop) {
  const list = [];
  const best = (key, title, icon, fmt, min = 1, low = false) => {
    const cand = rows.filter((r) => (r[key] || 0) >= min);
    if (!cand.length) return;
    const r = cand.slice().sort((a, b) => (low ? a[key] - b[key] : b[key] - a[key]))[0];
    list.push({ title, icon, name: r.name, color: r.color, val: fmt(r[key]) });
  };
  best('defeated', 'Scam Slayer', 'ShieldCheck', (v) => `${v} scams beaten`);
  best('moneyLost', 'Kevin’s Favorite Customer', 'CreditCard', (v) => `${fmtMoney(v)} lost to scams`, 100);
  best('maxCpu', 'Human Space Heater', 'Flame', (v) => `peaked at ${v}°C`, 60);
  best('fan', 'Fan Club President', 'Fan', (v) => `${v} fan spins`, 5);
  if (!coop) { best('sent', 'Chief Saboteur', 'Skull', (v) => `${v} sabotages sent`); best('received', 'Punching Bag', 'Target', (v) => `hit ${v} times`); }
  return list;
}

function OnlineResults({ room, me, net, onLeave, emotes }) {
  const r = room.results; if (!r) return null;
  const coop = r.mode === 'coop';
  const isHost = room.hostId === me.id;
  const votes = room.players.filter((p) => p.rematch).length;
  const aw = awards(r.players, coop);
  const winner = !coop && r.players[0];
  const medal = ['🥇', '🥈', '🥉', '4th'];
  return (
    <div className={`result online-res ${coop ? (r.won ? 'win' : 'lose') : 'win'}`}>
      <FloatingEmotes emotes={emotes} />
      <div className="res-title">{coop ? (r.won ? 'TEAM SURVIVED' : r.reason === 'bankrupt' ? 'TEAM BANKRUPT' : r.reason === 'meltdown' ? 'TEAM MELTDOWN' : 'TEAM DISBANDED') : 'WINNER'}</div>
      {!coop && winner && <div className="mr-name" style={{ color: winner.color }}>{winner.name}</div>}
      {coop && <div className="res-score"><small>Team score</small><b>{r.score.toLocaleString()}</b></div>}
      {!coop && (
        <div className="podium">
          {r.players.slice(0, 3).map((p, i) => (
            <div key={p.id} className={`pod p${i + 1}`} style={{ '--pc': p.color }}>
              <span className="pod-medal">{medal[i]}</span><b>{p.name}</b><span>{p.score.toLocaleString()}</span><div className="pod-bar" />
            </div>
          ))}
        </div>
      )}
      <div className="xp-dialog res-box">
        <div className="xptitle static"><Icon name="Trophy" size={14} /> {coop ? 'team_report.txt' : 'rankings.txt'}</div>
        <div className="res-body">
          {coop && (
            <>
              <div className="res-line"><span>Survival</span><small>{r.survival}s{r.won ? ' + full-run bonus' : ''}</small><b>{r.survivalPts.toLocaleString()}</b></div>
              <div className="res-line"><span>Team bank</span><small>{fmtMoney(r.money)} ÷ {r.n} players × {Math.round((r.survival / GAME_LEN) * 100)}%</small><b>{r.moneyPts.toLocaleString()}</b></div>
              <div className="res-line"><span>Scams defeated</span><small>{r.defeated} × 250</small><b>{r.scamPts.toLocaleString()}</b></div>
            </>
          )}
          <div className="lb">
            <div className={`lb-row head ${coop ? 'coop' : 'vs'}`}><span>{coop ? '' : '#'}</span><span>Player</span>{!coop && <span>Score</span>}<span>Time</span>{!coop && <span>Money</span>}<span>Scams</span><span>Peak</span>{!coop && <span>Sab ➜/⬅</span>}<span>Status</span></div>
            {r.players.map((p) => (
              <div key={p.id} className={`lb-row ${coop ? 'coop' : 'vs'} ${p.id === me.id ? 'top' : ''}`}>
                <span>{coop ? '' : p.rank}</span>
                <span className="nm"><i className="pdot" style={{ background: p.color }} /> {p.name}</span>
                {!coop && <span>{p.score.toLocaleString()}</span>}
                <span>{fmtTime(p.survival)}</span>
                {!coop && <span>{fmtMoney(p.money)}</span>}
                <span>{p.defeated}</span>
                <span>{p.maxCpu}°C</span>
                {!coop && <span>{p.sent}/{p.received}</span>}
                <span>{STATUS_LABEL[p.status] || p.status}{p.reason && p.status === 'eliminated' ? ` (${p.reason})` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {aw.length > 0 && (
        <div className="awards">
          {aw.map((a) => <div key={a.title} className="award" style={{ '--pc': a.color }}><Icon name={a.icon} size={18} /><div><b>{a.title}</b><span>{a.name} — {a.val}</span></div></div>)}
        </div>
      )}
      <div className="menu-row center">
        <button className="arc-btn big" disabled={me.rematch && !isHost} onClick={() => { net.send({ t: 'rematch' }); Sound.play('click'); }}>
          <Icon name="RotateCcw" size={18} /> {isHost ? 'Rematch (back to lobby)' : me.rematch ? 'Waiting for host…' : 'Rematch'}
        </button>
        <button className="arc-btn ghost" onClick={onLeave}><Icon name="LogOut" size={16} /> Leave room</button>
      </div>
      <p className="muted-note">{votes} of {room.players.filter((p) => p.connected).length} want a rematch.{isHost ? '' : ' The host takes everyone back to the lobby.'}</p>
      <EmoteBar net={net} />
    </div>
  );
}
