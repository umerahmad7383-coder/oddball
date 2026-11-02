import React, { useEffect, useRef, useState } from 'react';
import { Gavel, Hand, Zap, Crown, WifiOff, Moon, Check, Users, Shirt } from 'lucide-react';
import { BID_MS, increment, nextBid, maxBid, fmtM } from '../shared/rules.js';
import { BY_ID } from '../shared/players.js';
import { PlayerCard, TimerRing, Money, Confetti, useNow, Sound } from './components.jsx';
import { SquadEditor } from './Squad.jsx';

export function Auction({ r, lookup }) {
  const { room, me, net } = r;
  const st = room.state;
  const t = useNow(net, 100);
  const lot = st.lot;
  const team = st.teams[me.id];
  const f = lot ? BY_ID[lot.id] : null;
  const byId = Object.fromEntries(room.players.map((p) => [p.id, p]));
  const [tab, setTab] = useState('managers');
  const [busy, setBusy] = useState(false);
  const [extended, setExtended] = useState(false);
  const lastEnds = useRef(0);
  const lastTick = useRef(0);

  // detect the "+time" extension and play the final-seconds ticks
  useEffect(() => {
    if (!lot) return;
    if (lot.status === 'open' && lastEnds.current && lot.endsAt > lastEnds.current + 500 && lot.bids.length) { setExtended(true); setTimeout(() => setExtended(false), 1200); }
    lastEnds.current = lot.endsAt;
  }, [lot && lot.endsAt]);
  useEffect(() => { setBusy(false); }, [lot && lot.price, lot && lot.n, lot && lot.passes.length]);
  const remaining = lot ? Math.max(0, lot.endsAt - t) : 0;
  useEffect(() => {
    if (!lot || lot.status !== 'open') return;
    const s = Math.ceil(remaining / 1000);
    if (s <= 5 && s > 0 && s !== lastTick.current) { lastTick.current = s; Sound.play('tick'); }
  }, [Math.ceil(remaining / 1000)]);

  const full = team && team.squad.length >= st.size;
  const max = team ? maxBid(team, st.size) : 0;
  const need = lot ? nextBid(lot) : 0;
  const jump = lot ? need + increment(need) * 4 : 0;
  const leading = lot && lot.leaderId === me.id;
  const passed = lot && lot.passes.includes(me.id);
  const away = team && team.idle >= 3;
  const biddable = lot && (lot.status === 'open' || lot.status === 'closing');
  const bidReason = !team ? 'You’re spectating' : full ? 'Your squad is complete' : leading ? 'You’re the highest bidder' : need > max ? `Max bid ${fmtM(max)}: keep £5M per empty slot` : '';
  const bid = (amount) => { if (busy) return; setBusy(true); Sound.init(); Sound.play('mybid'); net.send({ t: 'bid', lot: lot.n, amount }); setTimeout(() => setBusy(false), 1500); };
  const pass = () => { net.send({ t: 'pass', lot: lot.n }); Sound.play('click'); };

  let stage;
  if (!lot) {
    const until = Math.max(0, Math.ceil((st.nextAt - t) / 1000));
    stage = <div className="stage-msg"><Gavel size={44} /><b>{st.lotN === 0 ? `The window opens in ${until}…` : 'Next lot…'}</b><span>{st.poolLeft} footballers in the pool</span></div>;
  } else {
    const leader = lot.leaderId && byId[lot.leaderId];
    const done = ['sold', 'unsold', 'skipped'].includes(lot.status);
    stage = (
      <div className={`stage-lot s-${lot.status}`}>
        <div className="lot-card">
          <PlayerCard f={f} flipped={lot.status === 'reveal' && remaining > lot.endsAt - lot.openAt + 1100} tag={lot.bargain ? 'Bargain bin' : null} />
          {lot.status === 'sold' && <div className="stamp sold" style={{ '--c': leader ? leader.color : '#ff4b3e' }}>SOLD<small>{leader ? leader.name : ''} · {fmtM(lot.price)}</small></div>}
          {lot.status === 'unsold' && <div className="stamp unsold">UNSOLD</div>}
          {lot.status === 'skipped' && <div className="stamp unsold small">NO BUYERS</div>}
          {lot.status === 'sold' && leading && <Confetti />}
        </div>
        <div className="lot-side">
          <div className="lot-n">Lot {lot.n}{lot.bargain ? ' · bargain bin' : ''}</div>
          <div className="price-row">
            {lot.status === 'reveal'
              ? <div className="price-block"><small>Starting price</small><Money value={lot.startPrice} className="price" /></div>
              : <div className="price-block"><small>{leader ? 'Current bid' : 'Starting price'}</small><Money value={lot.price} className="price" /></div>}
            {!done && <TimerRing remaining={lot.status === 'reveal' ? BID_MS : remaining} total={BID_MS} hot={lot.status !== 'reveal' && remaining < 5000}
              label={lot.status === 'reveal' ? 'Ready' : lot.status === 'closing' ? 'Going…' : Math.ceil(remaining / 1000)} />}
          </div>
          {extended && <div className="extend">+ time!</div>}
          <div className="leader" style={{ '--c': leader ? leader.color : 'transparent' }}>
            {leader ? <><Crown size={16} /> <b>{leader.id === me.id ? 'You' : leader.name}</b>{leader.id === me.id ? ' are' : ' is'} leading</> : lot.status === 'reveal' ? 'Bidding opens in a moment…' : done ? '' : 'No bids yet'}
          </div>
          {!done && (
            <div className="bid-controls">
              <button className="btn primary big bid-main" disabled={!biddable || !!bidReason || busy} onClick={() => bid(need)}>
                <Gavel size={20} /> Bid {fmtM(need)}
              </button>
              <div className="bid-sub">
                <button className="btn" disabled={!biddable || !!bidReason || busy || jump > max} onClick={() => bid(jump)}><Zap size={16} /> Jump to {fmtM(jump)}</button>
                <button className={`btn ${passed ? 'passed' : ''}`} disabled={!biddable || leading || passed || full || !team} onClick={pass}><Hand size={16} /> {passed ? 'Passed' : 'Pass'}</button>
              </div>
              <div className="bid-note">{bidReason || (passed ? 'You passed. Bid again any time to get back in.' : `Steps of ${fmtM(increment(lot.price))} at this price`)}</div>
            </div>
          )}
          {lot.bids.length > 0 && (
            <ol className="ticker">
              {lot.bids.slice(0, 4).map((b, i) => <li key={`${b.at}-${i}`} className={i === 0 ? 'fresh' : ''} style={{ '--c': byId[b.pid] ? byId[b.pid].color : '#999' }}><span className="dot" />{byId[b.pid] ? byId[b.pid].name : '?'}<b>{fmtM(b.amount)}</b></li>)}
            </ol>
          )}
        </div>
      </div>
    );
  }

  const managers = (
    <div className="mgrs">
      {room.players.filter((p) => st.teams[p.id]).map((p) => {
        const tm = st.teams[p.id];
        const status = !p.connected ? 'offline' : tm.squad.length >= st.size ? 'full' : lot && lot.leaderId === p.id ? 'leading' : lot && lot.passes.includes(p.id) ? 'passed' : tm.idle >= 3 ? 'away' : '';
        return (
          <div key={p.id} className={`mgr-card st-${status} ${p.id === me.id ? 'me' : ''}`} style={{ '--c': p.color }}>
            <div className="mc-top"><span className="mgr-dot" /><b>{p.name}{p.id === me.id ? ' (you)' : ''}</b>
              <span className="mc-status">{status === 'leading' ? <Crown size={13} /> : status === 'offline' ? <WifiOff size={13} /> : status === 'away' ? <Moon size={13} /> : status === 'full' ? <Check size={13} /> : status === 'passed' ? <Hand size={13} /> : null}{status ? ` ${status}` : ''}</span>
            </div>
            <div className="mc-money"><Money value={tm.budget} /></div>
            <div className="mc-slots">{Array.from({ length: st.size }, (_, i) => <i key={i} className={i < tm.squad.length ? 'on' : ''} />)}</div>
          </div>
        );
      })}
    </div>
  );
  const sales = (
    <div className="sales">
      {st.history.length === 0 ? <p className="muted">No signings yet.</p> : st.history.slice(0, 8).map((h) => {
        const p = byId[h.pid], fx = lookup(h.id);
        return <div key={h.n} className="sale" style={{ '--c': p ? p.color : '#999' }}><span className="dot" /><span className="sale-name">{fx ? fx.name : h.id}</span><span className="sale-to">{p ? p.name : ''}</span><b>{fmtM(h.price)}</b></div>;
      })}
    </div>
  );

  return (
    <div className="auction">
      <div className="topbar">
        <div className="tb-left"><span className="chip">{st.mode === 'quick' ? 'Quick · 7' : 'Classic · 11'}</span><span className="muted">{st.poolLeft} left in pool</span></div>
        {team && (
          <div className="tb-me">
            <div><small>Your budget</small><Money value={team.budget} className="big" /></div>
            <div><small>Max bid</small><b>{full ? '—' : fmtM(max)}</b></div>
            <div><small>Squad</small><b>{team.squad.length}/{st.size}</b></div>
          </div>
        )}
      </div>
      {away && !full && <div className="away-bar"><Moon size={16} /> You’ve been auto-passing because you skipped a few lots. <button className="btn small" onClick={() => net.send({ t: 'back' })}>I’m back</button></div>}
      <div className="auction-grid">
        <section className="stage">{stage}</section>
        <aside className="side">
          <div className="tabs">
            <button className={tab === 'managers' ? 'on' : ''} onClick={() => setTab('managers')}><Users size={15} /> Managers</button>
            <button className={tab === 'squad' ? 'on' : ''} onClick={() => setTab('squad')}><Shirt size={15} /> My squad</button>
            <button className={tab === 'sales' ? 'on' : ''} onClick={() => setTab('sales')}><Gavel size={15} /> Sales</button>
          </div>
          {tab === 'managers' && managers}
          {tab === 'sales' && sales}
          {tab === 'squad' && (team ? <SquadEditor r={r} team={team} lookup={lookup} compact /> : <p className="muted">You’re spectating.</p>)}
        </aside>
      </div>
      {r.feed.length > 0 && <div className="feed">{r.feed.slice(-2).map((x) => <div key={x.id}>{x.text}</div>)}</div>}
    </div>
  );
}
