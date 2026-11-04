import React, { useRef, useState } from 'react';
import { loadStore, saveStore, defaultStore, Sound, sum } from './game/core.js';
import { Game } from './game/Game.jsx';
import { Menu, Tutorial, Setup2P, Handoff, Result, MatchResult, Leaderboard, Screen } from './screens.jsx';
import { OnlineHub } from './online/Online.jsx';
import { recordPlay } from '../../../platform/client/api.js';

const initialJoin = (() => { try { return (new URLSearchParams(window.location.search).get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); } catch (e) { return ''; } })();

/* ================= App ================= */
export default function App() {
  const [store, setStore] = useState(loadStore);
  const storeRef = useRef(store); storeRef.current = store;
  const [screen, setScreen] = useState(initialJoin ? 'online' : 'menu');
  const [joinCode, setJoinCode] = useState(initialJoin);
  const [name, setName] = useState(store.lastName || '');
  const [current, setCurrent] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [last, setLast] = useState(null);
  const [match, setMatch] = useState(null);
  const [names, setNames] = useState(['Player 1', 'Player 2']);
  const [rounds, setRounds] = useState(1);
  const [muted, setMuted] = useState(!!store.muted);
  const [tutNext, setTutNext] = useState(null);
  Sound.muted = muted;

  const commit = (next) => { storeRef.current = next; setStore(next); saveStore(next); };
  const toggleMute = () => { const m = !muted; Sound.muted = m; setMuted(m); commit({ ...storeRef.current, muted: m }); if (!m) { Sound.init(); Sound.play('click'); } };
  const launch = (player, guided = false) => { Sound.init(); Sound.play('wave'); setCurrent({ player, guided }); setGameKey((k) => k + 1); setScreen('game'); };
  const cleanName = (n, d) => (n || '').trim().slice(0, 16) || d;

  const playSolo = () => {
    const p = cleanName(name, 'Player 1'); setName(p); setMatch(null);
    const first = !storeRef.current.seenTutorial;
    commit({ ...storeRef.current, lastName: p, seenTutorial: true });
    // first run: jump straight in; each scam explains itself the first time it shows up. The manual is still in the menu.
    launch(p, first);
  };
  const startMatch = () => {
    const n = [cleanName(names[0], 'Player 1'), cleanName(names[1], 'Player 2')];
    if (n[0] === n[1]) n[1] = n[1] + ' (2)';
    setNames(n);
    setMatch({ names: n, rounds, round: 0, turn: 0, scores: [[], []], details: [[], []], done: false });
    commit({ ...storeRef.current, seenTutorial: true });
    Sound.init(); setScreen('handoff');
  };

  const handleEnd = (result) => {
    recordPlay('anti-scam', { score: result.score, won: result.won, meta: { mode: match ? 'duel' : 'solo' } });
    const s = storeRef.current, player = current ? current.player : 'Player';
    const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: player, score: result.score, survival: Math.floor(result.survival), money: result.money, defeated: result.defeated, won: result.won, date: new Date().toISOString(), mode: match ? '2P' : 'Solo' };
    const lb = [...s.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    const rank = lb.findIndex((e) => e.id === entry.id);
    const best = { ...s.best }, records = [];
    if (result.score > best.score) { best.score = result.score; records.push('high score'); }
    if (Math.floor(result.survival) > best.survival) { best.survival = Math.floor(result.survival); records.push('longest survival'); }
    if (result.won && result.money > best.money) { best.money = result.money; records.push('most money after a win'); }
    if (result.defeated > best.defeated) { best.defeated = result.defeated; records.push('most scams defeated'); }
    let next = { ...s, leaderboard: lb, best, gamesPlayed: s.gamesPlayed + 1, wins: s.wins + (result.won ? 1 : 0) };
    if (match) {
      const m = { ...match, scores: match.scores.map((a) => a.slice()), details: match.details.map((a) => a.slice()) };
      m.scores[m.turn].push(result.score); m.details[m.turn].push(result);
      if (m.turn === 0) m.turn = 1; else { m.turn = 0; m.round += 1; }
      if (m.round >= m.rounds) {
        m.done = true;
        const t = [sum(m.scores[0]), sum(m.scores[1])];
        next = { ...next, matches: [{ id: entry.id, date: entry.date, names: m.names, totals: t, winner: t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1, rounds: m.rounds }, ...next.matches].slice(0, 8) };
      }
      setMatch(m);
    }
    commit(next);
    setLast({ result, rank, records, player });
    setScreen('result');
  };

  const toMenu = () => { setMatch(null); setScreen('menu'); };
  const recordOnline = (e) => {
    recordPlay('anti-scam', { score: e.score, won: e.won, meta: { mode: e.mode } });
    const s = storeRef.current;
    const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: new Date().toISOString(), ...e };
    const lb = [...s.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
    const best = { ...s.best };
    if (e.score > best.score) best.score = e.score;
    if (e.survival > best.survival) best.survival = e.survival;
    if (e.won && e.money > best.money) best.money = e.money;
    if (e.defeated > best.defeated) best.defeated = e.defeated;
    commit({ ...s, leaderboard: lb, best, gamesPlayed: s.gamesPlayed + 1, wins: s.wins + (e.won ? 1 : 0) });
  };
  const matchLabel = match && !match.done ? `Round ${match.round + 1}/${match.rounds}` : '';

  switch (screen) {
    case 'game':
      return <Game key={gameKey} player={current.player} guided={!!current.guided} onEnd={handleEnd} muted={muted} onToggleMute={toggleMute} matchLabel={matchLabel} />;
    case 'tutorial':
      return (
        <Screen><Tutorial onDone={() => { if (tutNext) { const p = tutNext; setTutNext(null); launch(p); } else setScreen('menu'); }} doneLabel={tutNext ? 'Start playing' : 'Got it'} onBack={() => { setTutNext(null); setScreen('menu'); }} /></Screen>
      );
    case 'setup2p':
      return <Setup2P names={names} setNames={setNames} rounds={rounds} setRounds={setRounds} onStart={startMatch} onBack={() => setScreen('menu')} muted={muted} onToggleMute={toggleMute} />;
    case 'handoff':
      return <Handoff match={match} onGo={() => launch(match.names[match.turn])} onQuit={toMenu} />;
    case 'result':
      return <Result last={last} match={match} onAgain={() => launch(last.player)} onMenu={toMenu} onNext={() => setScreen('handoff')} onMatchResult={() => setScreen('matchResult')} />;
    case 'matchResult':
      return <MatchResult match={match} onRematch={() => { setMatch({ names: match.names, rounds: match.rounds, round: 0, turn: 0, scores: [[], []], details: [[], []], done: false }); setScreen('handoff'); }} onMenu={toMenu} />;
    case 'online':
      return <OnlineHub initialCode={joinCode} defaultName={store.lastName || name} muted={muted} onToggleMute={toggleMute} onRecord={recordOnline} onExit={() => { setJoinCode(''); setScreen('menu'); }} />;
    case 'board':
      return <Leaderboard store={store} onBack={() => setScreen('menu')} onReset={() => commit({ ...defaultStore(), lastName: storeRef.current.lastName, muted: storeRef.current.muted, seenTutorial: true })} />;
    default:
      return <Menu store={store} name={name} setName={setName} onSolo={playSolo} onChallenge={() => setScreen('setup2p')} onOnline={() => { const p = (name || '').trim().slice(0, 16); if (p) commit({ ...storeRef.current, lastName: p }); Sound.init(); setScreen('online'); }} onTutorial={() => { setTutNext(null); setScreen('tutorial'); }} onBoard={() => setScreen('board')} muted={muted} onToggleMute={toggleMute} />;
  }
}

