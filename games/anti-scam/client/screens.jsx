/* Anti-Scam Arcade — menus, tutorial, local results and leaderboard screens. */
import React, { useState } from 'react';
import { GAME_LEN, sum, fmtMoney, fmtTime } from './game/core.js';
import { Icon, Pixel } from './game/ui.jsx';
import { GameSponsorNote } from '../../../platform/client/promo.jsx';

/* ================= Tutorial ================= */
export const TUT_SCAMS = [
  { icon: 'Download', name: 'Fake Download', how: 'Five identical DOWNLOAD buttons. Hover each one and read the status bar: the real link starts with https:// and ends with the exact file name. Wrong picks cost money and heat. On touch, tap once to preview.' },
  { icon: 'Phone', name: 'Tech Support Scam', how: 'Kevin bills you every second and his X button runs away. Open Task Manager and end his process.' },
  { icon: 'Bitcoin', name: 'Crypto Scam', how: 'The exchange stays locked until the inevitable crash. Buy to earn, but sell when the news gets suspicious, or lose it all in the rug pull.' },
  { icon: 'ShieldAlert', name: 'Fake Antivirus', how: 'Every big button charges you, and it auto-renews. Its X is fake too. Find the real exit hidden in the fine print, the license box, or the file list.' },
  { icon: 'Cpu', name: 'System Overload', how: 'Programs launch themselves and heat your CPU. Close them as fast as they appear. Some ask “are you sure?” first.' },
];
export function Tutorial({ onDone, doneLabel = 'Start playing', inGame, onBack }) {
  const [step, setStep] = useState(0);
  const pages = [
    {
      title: 'Survive the cursed PC',
      body: (
        <div className="tut-goal">
          <p>You’re trapped on a 2004 desktop. Every 15 seconds a new scam attacks. Hold out for <b>3 minutes</b>.</p>
          <div className="tut-meters grid gap-2">
            <div><Icon name="Wallet" size={18} /><b>Bank: $5,000</b><span>Hit $0 and you lose.</span></div>
            <div><Icon name="Thermometer" size={18} /><b>CPU: 40°C</b><span>Hit 100°C and you lose. Open scam windows heat it up.</span></div>
            <div><Icon name="Zap" size={18} /><b>Chaos meter</b><span>Rises with open scams and heat. High chaos brings surprises and bonus scams.</span></div>
          </div>
        </div>
      ),
    },
    {
      title: 'Know your scams',
      body: <div className="grid gap-2">{TUT_SCAMS.map((t) => <div key={t.name} className="tut-scam"><div className="tut-ic"><Icon name={t.icon} size={20} /></div><div><b>{t.name}</b><p>{t.how}</p></div></div>)}</div>,
    },
    {
      title: 'Your toolkit',
      body: (
        <div className="tut-tools grid gap-2">
          <div><Pixel name="taskmgr" size={34} /><p><b>Task Manager</b> ends processes. Use it on Kevin and runaway apps. Don’t end the system processes.</p></div>
          <div><Pixel name="fan" size={34} /><p><b>CoolFan.exe</b> cools your CPU every time you spin it.</p></div>
          <div><Pixel name="terminal" size={34} /><p><b>Event Terminal</b> logs every event, penalty and tip as it happens.</p></div>
          <div><Pixel name="recycle" size={34} /><p><b>Recycle Bin</b> might be hiding something. Check it once.</p></div>
          <p className="tut-note">Drag windows by their title bar. Minimized scams keep running. Press Esc to pause.</p>
        </div>
      ),
    },
    {
      title: 'Scoring',
      body: (
        <div className="tut-score grid gap-2">
          <div><b>Survival</b><span>10 points per second, plus 1,500 for lasting all 3 minutes</span></div>
          <div><b>Money</b><span>Your remaining balance, scaled by how long you survived</span></div>
          <div><b>Scams defeated</b><span>250 points each</span></div>
          <p>Your best runs go on the local leaderboard. Challenge mode lets two players take turns on one device.</p>
        </div>
      ),
    },
    {
      title: 'Playing online',
      body: (
        <div className="tut-score grid gap-2">
          <div><b>Versus</b><span>2–4 players, same waves at the same moment. Defeat 2 scams to earn a charge, then spend charges to sabotage rivals: send Kevin, flip their screen, fake their HUD, and more. A Firewall blocks the next attack.</span></div>
          <div><b>Co-op</b><span>Everyone shares one bank and one CPU. If either runs out, the whole team loses. Spend charges on assists like Liquid Nitrogen or sweeping a scam off a teammate’s screen.</span></div>
          <div><b>Global events</b><span>Three times a round, something hits everyone at once: heatwaves, forced updates, bank glitches and more.</span></div>
          <div><b>Knocked out?</b><span>Spectate the players still alive and heckle them with emotes.</span></div>
        </div>
      ),
    },
  ];
  const last = step === pages.length - 1;
  return (
    <div className="tut xp-dialog">
      <div className="xptitle static"><Icon name="HelpCircle" size={14} /> How to play — {step + 1} of {pages.length}</div>
      <div className="tut-body">
        <h2>{pages[step].title}</h2>
        {pages[step].body}
      </div>
      <div className="tut-nav">
        <div className="tut-dots">{pages.map((_, i) => <button key={i} aria-label={`Page ${i + 1}`} className={i === step ? 'on' : ''} onClick={() => setStep(i)} />)}</div>
        <div className="tut-btns">
          {step > 0 ? <button className="xp-b" onClick={() => setStep(step - 1)}><Icon name="ChevronLeft" size={14} /> Back</button>
            : !inGame && onBack ? <button className="xp-b" onClick={onBack}>Main menu</button> : null}
          {!last ? <button className="xp-b primary" onClick={() => setStep(step + 1)}>Next <Icon name="ChevronRight" size={14} /></button>
            : <button className="xp-b primary" onClick={onDone}>{doneLabel}</button>}
          {!last && inGame && <button className="xp-b" onClick={onDone}>Close</button>}
        </div>
      </div>
    </div>
  );
}

/* ================= Screens ================= */
export function Screen({ children, className = '' }) {
  return <div className={`screen ${className}`}><div className="grid-floor" aria-hidden="true" /><div className="screen-inner">{children}</div></div>;
}
export function SoundToggle({ muted, onToggleMute }) {
  return <button className="corner-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}><Icon name={muted ? 'VolumeX' : 'Volume2'} size={18} /></button>;
}
export function Menu({ store, name, setName, onSolo, onChallenge, onOnline, onTutorial, onBoard, muted, onToggleMute }) {
  return (
    <Screen className="menu">
      <a className="hub-link" href="/">← oddball</a>
      <SoundToggle muted={muted} onToggleMute={onToggleMute} />
      <div className="decor" aria-hidden="true">
        <div className="mini-pop p1"><div className="mp-t">Security alert</div><div className="mp-b">1,337 viruses found!</div></div>
        <div className="mini-pop p2"><div className="mp-t">Congratulations</div><div className="mp-b">You won an iPod!</div></div>
        <div className="mini-pop p3"><div className="mp-t">$SCAM ▲ 4,200%</div><div className="mp-b">Buy now!!!</div></div>
      </div>
      <h1 className="logo"><span>ANTI-SCAM</span><span>ARCADE</span></h1>
      <p className="tagline">Survive three minutes inside the most cursed PC on the internet.</p>
      <div className="xp-dialog menu-box">
        <div className="xptitle static"><Icon name="ShieldCheck" size={14} /> antiscam_arcade.exe</div>
        <div className="menu-body flex flex-col gap-3 p-4">
          <label className="field"><span>Your name</span>
            <input value={name} maxLength={16} placeholder="Player 1" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSolo(); }} />
          </label>
          <div className="menu-row">
            <button className="arc-btn big" onClick={onSolo}><Icon name="Play" size={18} /> Play solo</button>
            <button className="arc-btn big online" onClick={onOnline}><Icon name="Globe" size={18} /> Play online</button>
          </div>
          <div className="menu-row">
            <button className="arc-btn ghost" onClick={onChallenge}><Icon name="Swords" size={16} /> Same-device duel</button>
            <button className="arc-btn ghost" onClick={onTutorial}><Icon name="HelpCircle" size={16} /> How to play</button>
            <button className="arc-btn ghost" onClick={onBoard}><Icon name="Trophy" size={16} /> Leaderboard</button>
          </div>
          <div className="menu-stats">
            <div><small>Best score</small><b>{store.best.score.toLocaleString()}</b></div>
            <div><small>Games</small><b>{store.gamesPlayed}</b></div>
            <div><small>Survived</small><b>{store.wins}</b></div>
          </div>
        </div>
      </div>
      <GameSponsorNote game="anti-scam" style={{ color: 'var(--scr-muted)' }} />
    </Screen>
  );
}
export function Setup2P({ names, setNames, rounds, setRounds, onStart, onBack, muted, onToggleMute }) {
  return (
    <Screen>
      <SoundToggle muted={muted} onToggleMute={onToggleMute} />
      <div className="xp-dialog panel-box">
        <div className="xptitle static"><Icon name="Swords" size={14} /> Challenge mode</div>
        <div className="menu-body flex flex-col gap-3 p-4">
          <p className="lead">Take turns on this device. Highest total score wins.</p>
          {[0, 1].map((i) => (
            <label key={i} className="field"><span>Player {i + 1}</span>
              <input value={names[i]} maxLength={16} onChange={(e) => { const n = names.slice(); n[i] = e.target.value; setNames(n); }} />
            </label>
          ))}
          <div className="field"><span>Rounds each</span>
            <div className="seg">{[1, 3].map((r) => <button key={r} className={rounds === r ? 'on' : ''} onClick={() => setRounds(r)}>{r === 1 ? 'Quick match (1)' : 'Best total of 3'}</button>)}</div>
          </div>
          <div className="menu-row">
            <button className="arc-btn ghost" onClick={onBack}><Icon name="ChevronLeft" size={16} /> Back</button>
            <button className="arc-btn" onClick={onStart}><Icon name="Play" size={16} /> Start match</button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
export function Handoff({ match, onGo, onQuit }) {
  const p = match.turn, name = match.names[p], other = match.names[1 - p];
  const tot = (i) => sum(match.scores[i]);
  const target = p === 1 ? match.scores[0][match.round] : null;
  return (
    <Screen>
      <div className="handoff flex flex-col items-center gap-3.5 text-center max-w-[520px]">
        <div className="ho-round">Round {match.round + 1} of {match.rounds}</div>
        <div className="ho-name">{name}</div>
        <p>Pass the device to {name}. {other}, no peeking.</p>
        {target != null && <div className="ho-target"><Icon name="Crown" size={18} /> Score to beat this round: <b>{target.toLocaleString()}</b></div>}
        {match.round > 0 && <div className="ho-tot">Totals: {match.names[0]} {tot(0).toLocaleString()} — {match.names[1]} {tot(1).toLocaleString()}</div>}
        <div className="menu-row center">
          <button className="arc-btn big" onClick={onGo}><Icon name="Play" size={18} /> I’m ready</button>
          <button className="arc-btn ghost" onClick={onQuit}>Abandon match</button>
        </div>
      </div>
    </Screen>
  );
}
export function Result({ last, match, onAgain, onMenu, onNext, onMatchResult }) {
  const r = last.result;
  const title = r.won ? 'SURVIVED' : r.reason === 'bankrupt' ? 'BANKRUPT' : r.reason === 'meltdown' ? 'MELTDOWN' : 'RUN ENDED';
  const parts = [['Survival', `${Math.floor(r.survival)}s${r.won ? ' + full-run bonus' : ''}`, r.survivalPts], ['Money kept', `${fmtMoney(r.money)} × ${Math.round(r.survival / GAME_LEN * 100)}% survived`, r.moneyPts], ['Scams defeated', `${r.defeated} × 250`, r.scamPts]];
  return (
    <Screen>
      <div className={`result ${r.won ? 'win' : 'lose'}`}>
        <div className="res-title">{title}</div>
        <div className="res-player">{last.player}{match ? ` — round ${match.done ? match.rounds : (match.turn === 0 ? match.round : match.round + 1)} of ${match.rounds}` : ''}</div>
        <div className="res-score"><small>Score</small><b>{r.score.toLocaleString()}</b></div>
        {(last.records.length > 0 || last.rank >= 0) && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {last.records.map((t) => <span key={t} className="badge"><Icon name="Sparkles" size={13} /> New record: {t}</span>)}
            {last.rank >= 0 && <span className="badge alt"><Icon name="Medal" size={13} /> #{last.rank + 1} on the leaderboard</span>}
          </div>
        )}
        <div className="xp-dialog res-box">
          <div className="xptitle static"><Icon name="FileText" size={14} /> score_report.txt</div>
          <div className="res-body">
            {parts.map((p) => <div key={p[0]} className="res-line"><span>{p[0]}</span><small>{p[1]}</small><b>{p[2].toLocaleString()}</b></div>)}
            <div className="res-line total"><span>Total</span><small /><b>{r.score.toLocaleString()}</b></div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 pt-2 text-[11px] text-neutral-600">
              <span>Waves faced: {r.waves}</span><span>Peak CPU: {r.maxCpu}°C</span><span>Lost to scams: {fmtMoney(r.moneyLost)}</span>
            </div>
          </div>
        </div>
        <div className="menu-row center">
          {!match && <button className="arc-btn big" onClick={onAgain}><Icon name="RotateCcw" size={18} /> Play again</button>}
          {match && !match.done && <button className="arc-btn big" onClick={onNext}><Icon name="Users" size={18} /> Next up: {match.names[match.turn]}</button>}
          {match && match.done && <button className="arc-btn big" onClick={onMatchResult}><Icon name="Trophy" size={18} /> See match results</button>}
          <button className="arc-btn ghost" onClick={onMenu}><Icon name="Home" size={16} /> Main menu</button>
        </div>
      </div>
    </Screen>
  );
}
export function MatchResult({ match, onRematch, onMenu }) {
  const t = [sum(match.scores[0]), sum(match.scores[1])];
  const winner = t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1;
  return (
    <Screen>
      <div className="result win">
        <div className="res-title">{winner < 0 ? 'DRAW' : 'WINNER'}</div>
        <div className="mr-name">{winner < 0 ? 'Perfectly balanced' : match.names[winner]}</div>
        <div className="xp-dialog res-box">
          <div className="xptitle static"><Icon name="Swords" size={14} /> match_results.txt</div>
          <div className="res-body">
            <div className="mr-table">
              <div className="mr-row head"><span>Round</span><span>{match.names[0]}</span><span>{match.names[1]}</span></div>
              {Array.from({ length: match.rounds }, (_, i) => (
                <div key={i} className="mr-row"><span>{i + 1}</span>
                  {[0, 1].map((p) => { const v = match.scores[p][i], o = match.scores[1 - p][i]; return <span key={p} className={v > o ? 'lead' : ''}>{v.toLocaleString()}{match.details[p][i].won ? ' ✓' : ''}</span>; })}
                </div>
              ))}
              <div className="mr-row total"><span>Total</span><span className={winner === 0 ? 'lead' : ''}>{t[0].toLocaleString()}</span><span className={winner === 1 ? 'lead' : ''}>{t[1].toLocaleString()}</span></div>
            </div>
            <small className="mr-note">✓ survived the full 3 minutes</small>
          </div>
        </div>
        <div className="menu-row center">
          <button className="arc-btn big" onClick={onRematch}><Icon name="RotateCcw" size={18} /> Rematch</button>
          <button className="arc-btn ghost" onClick={onMenu}><Icon name="Home" size={16} /> Main menu</button>
        </div>
      </div>
    </Screen>
  );
}
export function Leaderboard({ store, onBack, onReset }) {
  const [confirm, setConfirm] = useState(false);
  const b = store.best;
  return (
    <Screen>
      <div className="w-full max-w-[680px] flex flex-col gap-3.5">
        <h2 className="board-title">HALL OF FAME</h2>
        <div className="records">
          <div><Icon name="Trophy" size={18} /><small>High score</small><b>{b.score.toLocaleString()}</b></div>
          <div><Icon name="Timer" size={18} /><small>Longest survival</small><b>{fmtTime(b.survival)}</b></div>
          <div><Icon name="Wallet" size={18} /><small>Most money kept</small><b>{fmtMoney(b.money)}</b></div>
          <div><Icon name="ShieldCheck" size={18} /><small>Most scams beaten</small><b>{b.defeated}</b></div>
        </div>
        <div className="xp-dialog res-box">
          <div className="xptitle static"><Icon name="Trophy" size={14} /> leaderboard.dat — {store.gamesPlayed} games, {store.wins} survived</div>
          <div className="res-body">
            {store.leaderboard.length === 0 ? <p className="empty">No runs yet. Play a game and your score lands here.</p> : (
              <div className="lb">
                <div className="lb-row head"><span>#</span><span>Name</span><span>Score</span><span>Time</span><span>Money</span><span>Scams</span></div>
                {store.leaderboard.map((e, i) => (
                  <div key={e.id} className={`lb-row ${i === 0 ? 'top' : ''}`}>
                    <span>{i + 1}</span><span className="nm">{e.name}{e.mode && e.mode !== 'Solo' ? <em> {e.mode}</em> : null}</span><span>{e.score.toLocaleString()}</span><span>{fmtTime(e.survival)}{e.won ? ' ✓' : ''}</span><span>{fmtMoney(e.money)}</span><span>{e.defeated}</span>
                  </div>
                ))}
              </div>
            )}
            {store.matches.length > 0 && (
              <div className="mt-3 grid gap-1 text-xs">
                <b>Recent challenges</b>
                {store.matches.map((m) => (
                  <div key={m.id} className="match-line flex flex-wrap gap-2">
                    <span className={m.winner === 0 ? 'lead' : ''}>{m.names[0]} {m.totals[0].toLocaleString()}</span><span>vs</span><span className={m.winner === 1 ? 'lead' : ''}>{m.names[1]} {m.totals[1].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="menu-row center">
          <button className="arc-btn" onClick={onBack}><Icon name="Home" size={16} /> Main menu</button>
          {!confirm ? <button className="arc-btn ghost" onClick={() => setConfirm(true)}><Icon name="Trash2" size={16} /> Reset records</button>
            : <button className="arc-btn danger" onClick={() => { onReset(); setConfirm(false); }}><Icon name="AlertTriangle" size={16} /> Yes, erase everything</button>}
        </div>
      </div>
    </Screen>
  );
}

