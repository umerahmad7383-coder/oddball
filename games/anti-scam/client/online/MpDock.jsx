import React, { useEffect, useRef, useState } from 'react';
import { SABOTAGES, ASSISTS, EMOTES, MAX_CHARGES, ENERGY_PER_CHARGE, GAME_LEN } from '../../shared/rules.js';
import { fmtMoney, fmtTime, Sound } from '../game/core.js';
import { Icon } from '../game/ui.jsx';

export const ACTIVE = ['playing', 'eliminated', 'survived', 'left'];
export const STATUS_LABEL = { playing: 'Alive', eliminated: 'Out', survived: 'Survived', left: 'Left', spectator: 'Watching', lobby: 'Lobby', disconnected: 'Disconnected', team: 'Team' };

export function PlayerRows({ room, meId, coop, compact }) {
  const rows = room.players.filter((p) => ACTIVE.includes(p.status)).slice().sort((a, b) => (b.stats?.score || 0) - (a.stats?.score || 0));
  return (
    <div className="prow-list">
      {rows.map((p, i) => {
        const st = p.stats || {};
        const status = !p.connected && p.status === 'playing' ? 'disconnected' : p.status;
        return (
          <div key={p.id} className={`prow s-${status} ${p.id === meId ? 'me' : ''}`}>
            <span className="prank">{coop ? '' : i + 1}</span>
            <span className="pdot" style={{ background: p.color }} />
            <span className="pname">{p.name}{p.id === meId ? ' (you)' : ''}{p.firewall ? ' 🛡️' : ''}</span>
            <span className={`pstat st-${status}`}>{STATUS_LABEL[status] || status}</span>
            {!compact && <span className="pnums">
              {!coop && <b>{fmtMoney(st.money || 0)}</b>}
              {!coop && <span className={st.cpu >= 85 ? 'hot' : ''}>{st.cpu || 40}°C</span>}
              <span title="Scams defeated"><Icon name="ShieldCheck" size={11} /> {st.defeated || 0}</span>
              {!coop && <span className="pscore">{(st.score || 0).toLocaleString()}</span>}
            </span>}
          </div>
        );
      })}
    </div>
  );
}

export function EmoteBar({ net }) {
  return (
    <div className="emote-bar">
      {EMOTES.map((e) => <button key={e} aria-label={`Send ${e}`} onClick={() => { net.send({ t: 'emote', e }); Sound.play('click'); }}>{e}</button>)}
    </div>
  );
}

export function MpDock({ s, E, online }) {
  const [open, setOpen] = useState(() => window.innerWidth >= 900);
  const [target, setTarget] = useState('leader');
  const room = online.getRoom();
  useEffect(() => {
    const upd = () => { s.dockW = open && window.innerWidth >= 900 ? 262 : 0; };
    upd(); window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [open]);
  if (!room) return null;
  const coop = online.mode === 'coop';
  const me = room.players.find((p) => p.id === online.meId) || {};
  const others = room.players.filter((p) => p.id !== online.meId && p.status === 'playing' && p.connected);
  const powers = coop ? ASSISTS : SABOTAGES;
  const charges = me.charges || 0, energy = me.energy || 0;
  const playing = s.phase === 'playing' && online.net.now() >= online.startAt;
  const tgtValid = target === 'leader' || target === 'random' || others.some((o) => o.id === target);
  const fire = (kind) => {
    const def = powers[kind];
    online.net.send({ t: 'power', kind, target: def.self ? online.meId : (tgtValid ? target : 'leader') });
    Sound.play('click');
  };

  if (!open) {
    return (
      <button className="dock-fab" onClick={() => setOpen(true)} aria-label="Open players and power-ups">
        <Icon name="Users" size={16} /> {room.players.filter((p) => p.status === 'playing').length}
        <span className="fab-charges"><Icon name="Zap" size={14} /> {charges}</span>
      </button>
    );
  }
  return (
    <aside className="dock" onPointerDown={(e) => e.stopPropagation()}>
      <div className="dock-head">
        <span><Icon name="Radio" size={14} /> {coop ? 'Team' : 'Live standings'}</span>
        {s.watchers > 0 && <span className="dock-watch" title="People spectating you"><Icon name="Eye" size={13} /> {s.watchers}</span>}
        <button aria-label="Collapse panel" onClick={() => setOpen(false)}><Icon name="PanelRightClose" size={15} /></button>
      </div>
      <PlayerRows room={room} meId={online.meId} coop={coop} />
      <div className="dock-sec">
        <div className="dock-title">
          <span>{coop ? 'Team assists' : 'Sabotage'}</span>
          <span className="charges">{Array.from({ length: MAX_CHARGES }, (_, i) => <i key={i} className={i < charges ? 'on' : ''}><Icon name="Zap" size={12} /></i>)}</span>
        </div>
        <div className="energy"><i style={{ width: `${(energy / ENERGY_PER_CHARGE) * 100}%` }} /></div>
        <small className="dock-hint">Beat {ENERGY_PER_CHARGE} scams to earn a charge.</small>
        {!Object.values(powers).every((d) => d.self) && (
          <div className="targets">
            {coop ? null : <><button className={target === 'leader' ? 'on' : ''} onClick={() => setTarget('leader')}><Icon name="Crown" size={11} /> Leader</button>
              <button className={target === 'random' ? 'on' : ''} onClick={() => setTarget('random')}>Random</button></>}
            {others.map((o) => <button key={o.id} className={target === o.id ? 'on' : ''} onClick={() => setTarget(o.id)} style={{ borderColor: o.color }}>{o.name}</button>)}
          </div>
        )}
        <div className="powers">
          {Object.entries(powers).map(([k, d]) => (
            <button key={k} className="power" disabled={!playing || charges < d.cost || (!d.self && others.length === 0)} onClick={() => fire(k)} title={d.desc}>
              <Icon name={d.icon} size={15} /><span>{d.name}</span><em>{'⚡'.repeat(d.cost)}</em>
            </button>
          ))}
        </div>
      </div>
      <EmoteBar net={online.net} />
    </aside>
  );
}

/* Read-only replica of another player's desktop, rebuilt from their snapshots. */
export function SpectateView({ snap, player }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const m = () => setW(el.getBoundingClientRect().width);
    m(); const ro = window.ResizeObserver ? new ResizeObserver(m) : null; if (ro) ro.observe(el);
    return () => ro && ro.disconnect();
  }, []);
  if (!snap) return <div ref={ref} className="spec-empty"><Icon name="Loader2" size={22} className="spin" /> Connecting to {player ? `${player.name}’s` : 'their'} screen…</div>;
  const scale = w / Math.max(320, snap.bw);
  return (
    <div ref={ref} className="spec">
      <div className="spec-hud">
        <span><Icon name="Wallet" size={13} /> {fmtMoney(snap.money)}</span>
        <span className={snap.cpu >= 85 ? 'hot' : ''}><Icon name="Thermometer" size={13} /> {snap.cpu}°C</span>
        <span><Icon name="Zap" size={13} /> Chaos {snap.chaos}%</span>
        <span><Icon name="ShieldCheck" size={13} /> {snap.defeated}</span>
        <span><Icon name="Timer" size={13} /> {fmtTime(GAME_LEN - snap.t)}</span>
      </div>
      <div className={`spec-desk ${snap.flip ? 'flipped' : ''}`} style={{ height: snap.bh * scale }}>
        <div className="bliss" aria-hidden="true" />
        {snap.ws.slice().sort((a, b) => a.z - b.z).map((x) => (
          <div key={x.id} className={`spec-win k-${x.k}`} style={{ left: x.x * scale, top: x.y * scale, width: x.w * scale, height: x.h * scale }}>
            <div className="spec-title"><Icon name={x.ic} size={11} /> <span>{x.ti}</span></div>
            <div className="spec-body">{x.i}</div>
          </div>
        ))}
        {snap.bsod && <div className="spec-bsod">BLUE SCREEN</div>}
        {snap.update && <div className="spec-bsod upd">Installing updates…</div>}
      </div>
      <div className="spec-log">{snap.log.map((l, i) => <div key={i} className={`tl ${l.k}`}>{l.m}</div>)}</div>
    </div>
  );
}
