import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gavel, Hand, Zap, Crown, WifiOff, Moon, Check, Bot, X, Minus, Plus, TrendingUp, Link2, Users } from 'lucide-react';
import { BID_MS, increment, nextBid, maxBid, fmtM } from '../shared/rules.js';
import { BY_ID } from '../shared/players.js';
import { FORMATIONS, evaluate, autoPlace, fit, linkStrength } from '../shared/tactics.js';
import { PlayerCard, TimerRing, Money, Confetti, useNow, Sound, groupOf, GROUP_COLOR, fitLabel } from './ui.jsx';
import { SquadEditor } from './Squad.jsx';

/* What would this footballer do for my squad? */
function useImpact(team, f, lookup) {
  return useMemo(() => {
    if (!team || !f) return null;
    const before = evaluate(team.formation, team.lineup, lookup);
    const placed = autoPlace(team.formation, team.lineup, f);
    const slot = placed.findIndex((id, i) => id === f.id && team.lineup[i] !== f.id);
    if (slot < 0) return { full: true };
    const look = (id) => (id === f.id ? f : lookup(id));
    const after = evaluate(team.formation, placed, look);
    const slotPos = FORMATIONS[team.formation].slots[slot].pos;
    const mates = team.squad.map((s) => lookup(s.id)).filter(Boolean);
    const clubMates = mates.filter((m) => linkStrength(m, f) === 3).length;
    const nationMates = mates.filter((m) => m.club !== f.club && m.nation === f.nation).length;
    return { slot, slotPos, fit: fit(f.pos, slotPos), eff: after.players[slot].eff, delta: Math.round((after.final - before.final) * 10) / 10, clubMates, nationMates };
  }, [team && team.formation, team && team.lineup.join(','), f && f.id]);
}

function AutoBid({ lot, team, size, net, need }) {
  const mine = team && team.auto && team.auto.lot === lot.n ? team.auto : null;
  const cap = team ? maxBid(team, size) : 0;
  const [val, setVal] = useState(() => Math.min(cap, need + increment(need) * 5));
  useEffect(() => { if (!mine) setVal((v) => Math.min(cap, Math.max(v, need))); }, [need, cap]);
  const step = (dir) => setVal((v) => Math.max(need, Math.min(cap, v + dir * increment(v))));
  if (mine) {
    return (
      <div className="auto on">
        <Bot size={18} /><span>Auto-bidding up to <b>{fmtM(mine.max)}</b></span>
        <button className="chip-btn" onClick={() => net.send({ t: 'autobid', lot: lot.n, max: 0 })}><X size={14} /> Stop</button>
      </div>
    );
  }
  return (
    <div className="auto">
      <Bot size={18} /><span>Auto-bid up to</span>
      <div className="stepper">
        <button aria-label="Lower limit" onClick={() => step(-1)}><Minus size={14} /></button>
        <b>{fmtM(val)}</b>
        <button aria-label="Raise limit" onClick={() => step(1)}><Plus size={14} /></button>
      </div>
      <button className="chip-btn go" disabled={val < need} onClick={() => { Sound.play('click'); net.send({ t: 'autobid', lot: lot.n, max: val }); }}>Set</button>
    </div>
  );
}

function Needs({ team, lookup }) {
  const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const s of team.squad) { const f = lookup(s.id); if (f) counts[groupOf(f.pos)]++; }
  return <div className="needs">{Object.entries(counts).map(([g, n]) => <span key={g} className={n ? '' : 'zero'} style={{ '--gc': GROUP_COLOR[g] }}>{g} {n}</span>)}</div>;
}

export function Auction({ r, lookup }) {
  const { room, me, net } = r;
  const st = room.state;
  const t = useNow(net, 100);
  const lot = st.lot;
  const team = st.teams[me.id];
  const f = lot ? BY_ID[lot.id] : null;
  const byId = Object.fromEntries(room.players.map((p) => [p.id, p]));
  const [busy, setBusy] = useState(false);
  const [extended, setExtended] = useState(false);
  const [toast, setToast] = useState('');
  const lastEnds = useRef(0), lastTick = useRef(0);

  useEffect(() => net.on('toast', (m) => { setToast(m.text); Sound.play('error'); setTimeout(() => setToast(''), 3500); }), [net]);
  useEffect(() => { if (r.error) { setToast(r.error); const id = setTimeout(() => { setToast(''); r.setError(''); }, 3500); return () => clearTimeout(id); } return undefined; }, [r.error]);
  useEffect(() => {
    if (!lot) return;
    if (lot.status === 'open' && lastEnds.current && lot.endsAt > lastEnds.current + 500 && lot.bids.length) { setExtended(true); setTimeout(() => setExtended(false), 1300); }
    lastEnds.current = lot.endsAt;
  }, [lot && lot.endsAt]);
  useEffect(() => { setBusy(false); }, [lot && lot.price, lot && lot.n, lot && lot.passes.length]);
  const remaining = lot ? Math.max(0, lot.endsAt - t) : 0;
  const secs = Math.ceil(remaining / 1000);
  useEffect(() => {
    if (!lot || lot.status !== 'open') return;
    if (secs <= 5 && secs > 0 && secs !== lastTick.current) { lastTick.current = secs; Sound.play(secs <= 3 ? 'beat' : 'tick'); }
  }, [secs]);

  const impact = useImpact(team, f, lookup);
  const full = team && team.squad.length >= st.size;
  const max = team ? maxBid(team, st.size) : 0;
  const need = lot ? nextBid(lot) : 0;
  const jump = lot ? need + increment(need) * 4 : 0;
  const leading = lot && lot.leaderId === me.id;
  const passed = lot && lot.passes.includes(me.id);
  const away = team && team.idle >= 3;
  const biddable = lot && (lot.status === 'open' || lot.status === 'closing');
  const reserved = team && !full ? team.budget - max : 0;
  const otherEmpty = team ? Math.max(0, st.size - team.squad.length - 1) : 0;
  // Say exactly why a bid isn't possible, so nobody wonders whether the button is broken
  const bidReason = !team ? 'You’re spectating'
    : full ? 'Your squad is complete'
      : lot && !biddable ? (lot.status === 'reveal' ? 'Bidding opens in a moment' : 'This lot is closed')
        : leading ? 'You’re the highest bidder'
          : need > team.budget ? `Not enough money: you have ${fmtM(team.budget)} and the next bid is ${fmtM(need)}`
            : need > max ? `${fmtM(reserved)} is reserved for your ${otherEmpty} other empty slot${otherEmpty === 1 ? '' : 's'}, so you can bid up to ${fmtM(max)}`
              : '';
  const bid = (amount) => { if (busy) return; setBusy(true); Sound.init(); Sound.play('mybid'); net.send({ t: 'bid', lot: lot.n, amount }); setTimeout(() => setBusy(false), 1500); };
  const pass = () => { net.send({ t: 'pass', lot: lot.n }); Sound.play('click'); };

  let stage;
  if (!lot) {
    const until = Math.max(0, Math.ceil((st.nextAt - t) / 1000));
    stage = (
      <div className="stage-msg">
        <div className="clock-big">{st.lotN === 0 ? `0${Math.min(9, until)}` : '··'}</div>
        <b>{st.lotN === 0 ? 'The window opens…' : 'Next lot coming up'}</b>
        <span>{st.poolLeft} footballers left in the pool</span>
      </div>
    );
  } else {
    const leader = lot.leaderId && byId[lot.leaderId];
    const done = ['sold', 'unsold', 'skipped'].includes(lot.status);
    const revealing = lot.status === 'reveal';
    stage = (
      <div className={`stage-lot s-${lot.status}`}>
        <div className="lot-card" key={lot.n}>
          <div className="spot" aria-hidden="true" />
          <PlayerCard f={f} flipped={revealing && remaining > lot.endsAt - lot.openAt + 1100} tag={lot.bargain ? 'BARGAIN BIN' : null} />
        </div>
        <div className="lot-side">
          <div className="lot-head">
            <span className="breaking-chip">{revealing ? 'BREAKING' : done ? (lot.status === 'sold' ? 'CONFIRMED' : 'NO DEAL') : 'LIVE BIDDING'}</span>
            <span className="lot-n">Lot {lot.n}{lot.bargain ? ' · half price' : ''}</span>
          </div>
          <div className="price-row">
            <div className="price-block">
              <small>{!revealing && leader ? 'Current bid' : 'Asking price'}</small>
              <Money value={revealing ? lot.startPrice : lot.price} className="price" />
            </div>
            {!done && <TimerRing remaining={revealing ? BID_MS : remaining} total={BID_MS} hot={!revealing && remaining < 5000}
              label={revealing ? 'Ready' : lot.status === 'closing' ? 'Going' : secs} />}
          </div>
          {extended && <div className="extend">+ TIME ADDED</div>}
          <div className={`leader ${leader ? 'has' : ''}`} style={{ '--c': leader ? leader.color : 'transparent' }}>
            {leader ? <><Crown size={16} /> <b>{leader.id === me.id ? 'You' : leader.name}</b>&nbsp;{leader.id === me.id ? 'are' : 'is'} winning{lot.bids[0] && lot.bids[0].auto ? <em>&nbsp;(auto)</em> : null}</>
              : revealing ? 'Bidding opens in a moment…' : done ? '' : 'No bids yet. Be first.'}
          </div>
          {!done && impact && !impact.full && team && !full && (
            <div className="impact">
              <TrendingUp size={16} />
              <span>Would play <b>{impact.slotPos}</b> ({fitLabel(f.pos, impact.slotPos)}) at <b>{impact.eff}</b></span>
              <span className="imp-score">Score {impact.delta >= 0 ? '+' : ''}{impact.delta}</span>
              {(impact.clubMates > 0 || impact.nationMates > 0) && <span className="imp-links"><Link2 size={13} /> {impact.clubMates ? `${impact.clubMates} clubmate${impact.clubMates > 1 ? 's' : ''}` : ''}{impact.clubMates && impact.nationMates ? ', ' : ''}{impact.nationMates ? `${impact.nationMates} compatriot${impact.nationMates > 1 ? 's' : ''}` : ''}</span>}
            </div>
          )}
          {!done && (
            <div className="bid-controls">
              <button className="btn bid-main" disabled={!biddable || !!bidReason || busy} onClick={() => bid(need)}>
                <Gavel size={22} /> BID {fmtM(need)}
              </button>
              <div className="bid-sub">
                <button className="btn ghost" disabled={!biddable || !!bidReason || busy || jump > max} onClick={() => bid(jump)}><Zap size={16} /> Jump to {fmtM(jump)}</button>
                <button className={`btn ghost ${passed ? 'passed' : ''}`} disabled={!biddable || leading || passed || full || !team} onClick={pass}><Hand size={16} /> {passed ? 'Passed' : 'Pass'}</button>
              </div>
              {team && !full && biddable && (!bidReason || leading) && <AutoBid lot={lot} team={team} size={st.size} net={net} need={leading ? lot.price : need} />}
              <div className="bid-note">{bidReason || (passed ? 'You passed. Bid again any time to get back in.' : `Bids go up in ${fmtM(increment(lot.price))} steps at this price`)}</div>
            </div>
          )}
          {lot.bids.length > 0 && !done && (
            <ol className="bidlog">
              {lot.bids.slice(0, 4).map((b, i) => <li key={`${b.at}-${i}`} className={i === 0 ? 'fresh' : ''} style={{ '--c': byId[b.pid] ? byId[b.pid].color : '#999' }}><span className="dot" />{byId[b.pid] ? byId[b.pid].name : '?'}{b.auto ? <em>auto</em> : null}<b>{fmtM(b.amount)}</b></li>)}
            </ol>
          )}
        </div>
        {lot.status === 'sold' && (
          <div className="hwg" style={{ '--c': leader ? leader.color : '#ffe14d' }}>
            <div className="hwg-top">HERE WE GO!</div>
            <div className="hwg-who">{f.name} <span>➜</span> {leader ? (leader.id === me.id ? 'YOU' : leader.name) : ''}</div>
            <div className="hwg-fee">{fmtM(lot.price)}</div>
            {leading && <Confetti />}
          </div>
        )}
        {lot.status === 'unsold' && <div className="stamp-x">NO BIDS<small>{st.bargain ? 'Gone for good' : 'He may return at half price'}</small></div>}
        {lot.status === 'skipped' && <div className="stamp-x">NOBODY CAN AFFORD HIM</div>}
      </div>
    );
  }

  const managers = room.players.filter((p) => st.teams[p.id]);
  return (
    <div className="auction">
      <div className="topbar">
        <div className="tb-left">
          <span className="chip">{st.mode === 'quick' ? 'Quick · 7-a-side' : 'Classic · XI'}</span>
          <span className="dim">{st.poolLeft} left in pool · lot {st.lotN}</span>
        </div>
        {team && (
          <div className="tb-me">
            <div><small>Budget</small><Money value={team.budget} className="big gold" /></div>
            <div><small>Reserved</small><b title="£5M kept back for each other empty slot">{full ? '—' : fmtM(team.budget - max)}</b></div>
            <div><small>Can bid</small><b>{full ? '—' : fmtM(max)}</b></div>
            <div><small>Squad</small><b>{team.squad.length}/{st.size}</b></div>
          </div>
        )}
      </div>
      {away && !full && <div className="away-bar"><Moon size={16} /> You’re auto-passing because you skipped a few lots. <button className="chip-btn go" onClick={() => net.send({ t: 'back' })}>I’m back</button></div>}
      <div className="auction-grid">
        <section className="stage">{stage}{toast && <div className="stage-toast">{toast}</div>}</section>
        <aside className="col squad-col">
          <h3>Your {st.size === 7 ? 'VII' : 'XI'}</h3>
          {team ? <SquadEditor r={r} team={team} lookup={lookup} compact ghost={impact && !impact.full && f && lot && !['sold', 'unsold', 'skipped'].includes(lot.status) ? { slot: impact.slot, f, eff: impact.eff } : null} />
            : <p className="dim">You’re spectating.</p>}
        </aside>
        <aside className="col managers-col">
          <h3><Users size={15} /> Managers</h3>
          <div className="mgrs">
            {managers.map((p) => {
              const tm = st.teams[p.id];
              const status = !p.connected ? 'offline' : tm.squad.length >= st.size ? 'done' : lot && lot.leaderId === p.id ? 'winning' : lot && lot.passes.includes(p.id) ? 'passed' : tm.idle >= 3 ? 'away' : tm.auto ? 'auto' : '';
              return (
                <div key={p.id} className={`mgr-card st-${status} ${p.id === me.id ? 'me' : ''}`} style={{ '--c': p.color }}>
                  <div className="mc-top"><span className="crest">{p.name.slice(0, 1).toUpperCase()}</span><b>{p.name}{p.id === me.id ? ' (you)' : ''}</b>
                    <span className="mc-status">{status === 'winning' ? <Crown size={13} /> : status === 'offline' ? <WifiOff size={13} /> : status === 'away' ? <Moon size={13} /> : status === 'done' ? <Check size={13} /> : status === 'passed' ? <Hand size={13} /> : status === 'auto' ? <Bot size={13} /> : null}{status ? ` ${status}` : ''}</span>
                  </div>
                  <div className="mc-row"><Money value={tm.budget} className="mc-money" /><span className="mc-count">{tm.squad.length}/{st.size}</span></div>
                  <Needs team={tm} lookup={lookup} />
                </div>
              );
            })}
          </div>
          {st.history.length > 0 && (
            <>
              <h3><Gavel size={15} /> Done deals</h3>
              <div className="sales">
                {st.history.slice(0, 6).map((h) => {
                  const p = byId[h.pid], fx = lookup(h.id);
                  return <div key={h.n} className="sale" style={{ '--c': p ? p.color : '#999' }}><span className="dot" /><span className="sale-name">{fx ? fx.name : h.id}</span><span className="sale-to">{p ? p.name : ''}</span><b>{fmtM(h.price)}</b></div>;
                })}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
