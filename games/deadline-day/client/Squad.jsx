import React, { useEffect, useMemo, useRef, useState } from 'react';
import { recordPlay } from '../../../platform/client/api.js';
import { Wand2, Lock, Unlock, Timer, Trophy, RotateCcw, LogOut, Check, ChevronDown, Home } from 'lucide-react';
import { fmtM } from '../shared/rules.js';
import { FORMATIONS, formationsFor, evaluate, arrange, fit } from '../shared/tactics.js';
import { Pitch, Portrait, useNow, Confetti, fitLabel, Sound } from './ui.jsx';

/* Local copy of the lineup so swaps feel instant; the server copy wins whenever it changes. */
function useLineup(team) {
  const key = team.formation + '|' + team.lineup.join(',');
  const [local, setLocal] = useState({ formation: team.formation, lineup: team.lineup });
  useEffect(() => { setLocal({ formation: team.formation, lineup: team.lineup }); }, [key]);
  return [local, setLocal];
}

export function SquadEditor({ r, team, lookup, compact, ghost }) {
  const st = r.room.state;
  const [local, setLocal] = useLineup(team);
  const [sel, setSel] = useState(null);
  const ev = useMemo(() => evaluate(local.formation, local.lineup, lookup), [local, lookup]);
  const push = (formation, lineup) => { setLocal({ formation, lineup }); r.send({ t: 'lineup', formation, lineup }); };
  const tap = (i) => {
    if (sel === null) { if (local.lineup[i]) setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    swap(sel, i);
  };
  const swap = (a, b) => { const next = local.lineup.slice(); [next[a], next[b]] = [next[b], next[a]]; setSel(null); Sound.play('click'); push(local.formation, next); };
  const ids = team.squad.map((s) => s.id);
  const selF = sel !== null ? lookup(local.lineup[sel]) : null;
  return (
    <div className={`squad ${compact ? 'compact' : ''}`}>
      <div className="formations">
        {formationsFor(st.mode).map((k) => (
          <button key={k} className={local.formation === k ? 'on' : ''} onClick={() => { setSel(null); push(k, arrange(k, ids, lookup)); }}>{FORMATIONS[k].label}</button>
        ))}
        <button className="best" disabled={!ids.length} onClick={() => { setSel(null); push(local.formation, arrange(local.formation, ids, lookup)); }}><Wand2 size={14} /> Best XI</button>
      </div>
      <Pitch formation={local.formation} lineup={local.lineup} lookup={lookup} editable selected={sel} onSlot={tap} onSwap={swap} compact={compact} ghost={ghost} />
      <div className="squad-hint">
        {selF ? <>Moving <b>{selF.name}</b> ({fitLabel(selF.pos, FORMATIONS[local.formation].slots[sel].pos)}). Tap another spot to swap.</> : ghost ? <>The faded player shows where <b>{ghost.f.name}</b> would go.</> : ids.length ? 'Drag a player onto another spot, or tap two spots, to swap. Lines glow when teammates share a club, nation or league.' : 'Your signings will appear here as you win them.'}
      </div>
      <div className="squad-stats">
        <div><small>Avg rating</small><b>{ev.avgEff}</b></div>
        <div><small>Chemistry</small><b>{ev.chemPct}%</b></div>
        <div className="hl"><small>Score</small><b>{ev.final}</b></div>
      </div>
    </div>
  );
}

export function Tactics({ r, lookup }) {
  const { room, me, net } = r;
  const st = room.state;
  const t = useNow(net, 250);
  const team = st.teams[me.id];
  const left = Math.max(0, Math.ceil((st.tacticsEndsAt - t) / 1000));
  const managers = room.players.filter((p) => st.teams[p.id]);
  return (
    <div className="tactics">
      <div className="tac-head">
        <div>
          <h1 className="dd-h">Window closed</h1>
          <p className="muted">Pick a formation and arrange your squad. When everyone locks in, the table is revealed.</p>
        </div>
        <div className="tac-timer"><Timer size={18} /> {left}s</div>
      </div>
      <div className="tac-grid">
        {team ? <SquadEditor r={r} team={team} lookup={lookup} /> : <p className="muted">You’re spectating.</p>}
        <aside className="tac-side">
          {team && (
            <button className={`btn big ${team.ready ? '' : 'primary'}`} onClick={() => net.send({ t: 'lock', ready: !team.ready })}>
              {team.ready ? <><Unlock size={18} /> Locked in (tap to edit)</> : <><Lock size={18} /> Lock in my XI</>}
            </button>
          )}
          <div className="panel">
            <h2>Managers</h2>
            {managers.map((p) => (
              <div key={p.id} className="mgr" style={{ '--c': p.color }}>
                <span className="mgr-dot" /><span className="mgr-name">{p.name}{p.id === me.id ? ' (you)' : ''}</span>
                <span className="mgr-state">{st.teams[p.id].ready ? <><Check size={14} /> Locked</> : 'Thinking…'}</span>
              </div>
            ))}
          </div>
          {team && (
            <div className="panel signings">
              <h2>Your signings · spent {fmtM(team.spent)}</h2>
              {team.squad.slice().sort((a, b) => b.price - a.price).map((s) => {
                const f = lookup(s.id); if (!f) return null;
                return <div key={s.id} className="sign"><span className="sign-face"><Portrait f={f} /></span><span className="sign-name">{f.name}<small>{f.pos} · {f.rating}</small></span><b>{s.academy ? 'Free' : fmtM(s.price)}</b></div>;
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function awards(rows, st, lookup) {
  const out = [];
  const sales = [];
  for (const row of rows) for (const s of st.teams[row.pid].squad) if (!s.academy) sales.push({ row, s, f: lookup(s.id) });
  const big = sales.slice().sort((a, b) => b.s.price - a.s.price)[0];
  if (big) out.push({ t: 'Record signing', who: big.row, d: `${big.f.name} for ${fmtM(big.s.price)}` });
  const value = sales.filter((x) => x.f.rating >= 80).sort((a, b) => a.s.price / a.f.rating - b.s.price / b.f.rating)[0];
  if (value) out.push({ t: 'Bargain of the window', who: value.row, d: `${value.f.name} (${value.f.rating}) for ${fmtM(value.s.price)}` });
  const chem = rows.slice().sort((a, b) => b.chem - a.chem)[0];
  if (chem) out.push({ t: 'Chemistry king', who: chem, d: `${chem.chem}% chemistry` });
  const thrift = rows.slice().sort((a, b) => b.remaining - a.remaining)[0];
  if (thrift) out.push({ t: 'Tightest wallet', who: thrift, d: `${fmtM(thrift.remaining)} left unspent` });
  return out;
}

export function Results({ r, lookup }) {
  const { room, me } = r;
  const st = room.state;
  const rows = st.results || [];
  const [open, setOpen] = useState(rows[0] ? rows[0].pid : null);
  const winner = rows[0];
  const votes = room.players.filter((p) => p.rematch && p.connected).length;
  const aw = awards(rows, st, lookup);
  const recorded = useRef(false);
  useEffect(() => {
    const mine = rows.find((x) => x.pid === me.id);
    if (!mine || recorded.current) return;
    recorded.current = true;
    recordPlay('deadline-day', { score: mine.final, won: mine.rank === 1, meta: { rank: mine.rank, managers: rows.length, mode: st.mode } });
  }, [rows.length]);
  return (
    <div className="results">
      {winner && winner.pid === me.id && <Confetti />}
      <div className="res-hero">
        <Trophy size={40} />
        <h1 className="dd-h">{winner ? `${winner.pid === me.id ? 'You win' : `${winner.name} wins`}` : 'Results'}</h1>
        {winner && <p className="muted">Final score {winner.final} · {winner.formation} · {winner.avg} avg rating · {winner.chem}% chemistry</p>}
      </div>
      <div className="podium">
        {rows.slice(0, 3).map((row, i) => (
          <div key={row.pid} className={`pod p${i + 1}`} style={{ '--c': row.color }}>
            <span className="pod-rank">{i + 1}</span><b>{row.name}</b><span className="pod-score">{row.final}</span><div className="pod-bar" />
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table className="lb">
          <thead><tr><th>#</th><th>Manager</th><th>Score</th><th className="hide-sm">Avg OVR</th><th>Chem</th><th className="hide-sm">Spent</th><th className="hide-sm">Left</th><th /></tr></thead>
          <tbody>
            {rows.map((row) => (
              <React.Fragment key={row.pid}>
                <tr className={`${row.pid === me.id ? 'me' : ''} ${open === row.pid ? 'open' : ''}`} style={{ '--c': row.color }} onClick={() => setOpen(open === row.pid ? null : row.pid)}>
                  <td>{row.rank}</td><td className="nm"><span className="mgr-dot" />{row.name}{row.left ? ' (left)' : ''}</td><td><b>{row.final}</b></td><td className="hide-sm">{row.avg}</td><td>{row.chem}%</td><td className="hide-sm">{fmtM(row.spent)}</td><td className="hide-sm">{fmtM(row.remaining)}</td>
                  <td><ChevronDown size={16} className="chev" /></td>
                </tr>
                {open === row.pid && (
                  <tr className="detail"><td colSpan={8}>
                    <div className="detail-sum">Avg rating <b>{row.avg}</b> · Chemistry <b>{row.chem}%</b> · Spent <b>{fmtM(row.spent)}</b> · Left <b>{fmtM(row.remaining)}</b> · {row.formation}</div>
                    <div className="detail-grid">
                      <Pitch formation={row.formation} lineup={row.lineup} lookup={lookup} compact />
                      <div className="signings">
                        {st.teams[row.pid].squad.slice().sort((a, b) => b.price - a.price).map((s) => {
                          const f = lookup(s.id); if (!f) return null;
                          const slotIdx = row.lineup.indexOf(s.id), slot = slotIdx >= 0 ? FORMATIONS[row.formation].slots[slotIdx].pos : '';
                          return <div key={s.id} className="sign"><span className="sign-face"><Portrait f={f} /></span><span className="sign-name">{f.name}<small>{f.pos}{slot && slot !== f.pos ? ` → ${slot}` : ''} · {f.rating}{slot && fit(f.pos, slot) !== 'natural' ? ` · ${fitLabel(f.pos, slot)}` : ''}</small></span><b>{s.academy ? 'Free' : fmtM(s.price)}</b></div>;
                        })}
                      </div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted center">Score = average effective rating × 0.85 + chemistry % × 0.15. Ties go to whoever has more money left.</p>
      {aw.length > 0 && (
        <div className="awards">
          {aw.map((a) => <div key={a.t} className="award" style={{ '--c': a.who.color }}><b>{a.t}</b><span>{a.who.name}</span><small>{a.d}</small></div>)}
        </div>
      )}
      <div className="lobby-actions">
        <button className="btn primary big" disabled={me.rematch && !r.isHost} onClick={r.rematch}><RotateCcw size={20} /> {r.isHost ? 'Rematch (back to lobby)' : me.rematch ? 'Waiting for host…' : 'Rematch'}</button>
        <button className="btn" onClick={r.leave}><LogOut size={18} /> Leave room</button>
        <a className="btn" href="/"><Home size={18} /> oddball</a>
      </div>
      <p className="muted center">{votes} want a rematch.{r.isHost ? '' : ' The host takes everyone back to the lobby.'}</p>
    </div>
  );
}
