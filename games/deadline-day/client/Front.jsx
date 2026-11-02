import React, { useState } from 'react';
import { Gavel, Users, Trophy, Copy, Check, Share2, LogOut, Crown, Hourglass, Play, WifiOff, Link as LinkIcon, Loader2 } from 'lucide-react';
import { inviteLink, readJoinCode } from '../../../platform/client/useRoom.js';
import { MODES, BUDGET, MAX_PLAYERS, MIN_PLAYERS, fmtM } from '../shared/rules.js';
import { PlayerCard, Sound } from './components.jsx';
import { BY_ID } from '../shared/players.js';

const NAME_KEY = 'oddball.name';
export const savedName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } };
const saveName = (n) => { try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* ignore */ } };
const SHOWCASE = ['kylian-mbappe', 'lamine-yamal', 'erling-haaland'];

export function Landing({ r }) {
  const [name, setName] = useState(savedName());
  const [code, setCode] = useState(readJoinCode());
  const ok = r.conn === 'open';
  const go = (fn) => { const n = name.trim().slice(0, 16) || 'Manager'; saveName(n); Sound.init(); fn(n); };
  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) { r.setError('Room codes are 6 characters, like K7QX2M.'); return; }
    go((n) => r.join(c, n));
  };
  return (
    <div className="landing">
      <div className="land-hero">
        <div className="land-cards" aria-hidden="true">
          {SHOWCASE.map((id, i) => BY_ID[id] && <div key={id} className={`lc lc${i}`}><PlayerCard f={BY_ID[id]} size="sm" /></div>)}
        </div>
        <h1 className="dd-title"><span>Deadline</span><span>Day</span></h1>
        <p className="land-sub">The window slams shut tonight. You’ve got {fmtM(BUDGET)}. Outbid your mates for the best XI.</p>
      </div>
      <div className="land-panel">
        {r.resolved || !readJoinCode() ? null : <p className="muted flex items-center gap-2"><Loader2 size={14} className="spin" /> Finding your room…</p>}
        <label className="field"><span>Your manager name</span>
          <input value={name} maxLength={16} placeholder="e.g. Sir Alex" onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn primary big" disabled={!ok} onClick={() => go((n) => r.create(n))}><Gavel size={20} /> Start an auction</button>
        <div className="or"><span>or join one</span></div>
        <div className="join-row">
          <input className="code" value={code} maxLength={6} placeholder="ROOM CODE" spellCheck={false} autoCapitalize="characters"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
          <button className="btn" disabled={!ok} onClick={join}><LinkIcon size={18} /> Join</button>
        </div>
        {r.error && <p className="err">{r.error}</p>}
        {!ok && <p className="muted flex items-center gap-2"><Loader2 size={14} className="spin" /> {r.conn === 'reconnecting' ? 'Can’t reach the server, retrying…' : 'Connecting…'}</p>}
      </div>
      <ol className="how">
        <li><Gavel size={22} /><b>Bid live</b><span>Footballers go under the hammer one by one. 20 seconds, last-second bids add time.</span></li>
        <li><Users size={22} /><b>Build your XI</b><span>Arrange them on the pitch. Teammates from the same club, nation or league link up.</span></li>
        <li><Trophy size={22} /><b>Best squad wins</b><span>Score = 85% average rating + 15% chemistry. Money left over breaks ties.</span></li>
      </ol>
    </div>
  );
}

export function Lobby({ r }) {
  const { room, me } = r;
  const [copied, setCopied] = useState('');
  const isHost = r.isHost;
  const players = room.players.filter((p) => !p.left);
  const connected = players.filter((p) => p.connected);
  const notReady = connected.filter((p) => !p.isHost && !p.ready);
  const why = connected.length < MIN_PLAYERS ? `Waiting for at least ${MIN_PLAYERS} managers. Share the code!` : notReady.length ? `Waiting for ${notReady.map((p) => p.name).join(', ')}` : '';
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1600); } catch (e) { setCopied('fail'); } };
  const share = async () => {
    const url = inviteLink(room.code);
    if (navigator.share) { try { await navigator.share({ title: 'Deadline Day', text: `Join my Deadline Day auction: ${room.code}`, url }); return; } catch (e) { /* cancelled */ } }
    copy(url, 'link');
  };
  const mode = room.settings.mode;
  return (
    <div className="lobby">
      <div className="lobby-code">
        <small>Room code</small>
        <div className="code-big">{room.code.split('').map((c, i) => <span key={i} style={{ animationDelay: `${i * 0.05}s` }}>{c}</span>)}</div>
        <div className="row-gap">
          <button className="btn small" onClick={() => copy(room.code, 'code')}>{copied === 'code' ? <Check size={16} /> : <Copy size={16} />} {copied === 'code' ? 'Copied' : 'Copy code'}</button>
          <button className="btn small" onClick={share}>{copied === 'link' ? <Check size={16} /> : <Share2 size={16} />} {copied === 'link' ? 'Link copied' : 'Invite link'}</button>
        </div>
        {copied === 'fail' && <p className="muted">Couldn’t copy. Send this link: {inviteLink(room.code)}</p>}
      </div>

      <div className="lobby-grid">
        <section className="panel">
          <h2>Managers <span className="count">{players.length}/{MAX_PLAYERS}</span></h2>
          <div className="mgr-list">
            {players.map((p) => (
              <div key={p.id} className={`mgr ${p.id === me.id ? 'me' : ''} ${p.connected ? '' : 'off'}`} style={{ '--c': p.color }}>
                <span className="mgr-dot" />
                <span className="mgr-name">{p.name}{p.id === me.id ? ' (you)' : ''}</span>
                <span className="mgr-state">
                  {!p.connected ? <><WifiOff size={14} /> Reconnecting</> : p.isHost ? <><Crown size={14} /> Host</> : p.ready ? <><Check size={14} /> Ready</> : 'Not ready'}
                </span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, Math.min(3, MAX_PLAYERS - players.length)) }, (_, i) => <div key={i} className="mgr empty">Empty seat</div>)}
          </div>
        </section>
        <section className="panel">
          <h2>Format</h2>
          <div className="modes">
            {Object.entries(MODES).map(([k, m]) => (
              <button key={k} className={`mode ${mode === k ? 'on' : ''}`} disabled={!isHost} onClick={() => r.settings({ mode: k })}>
                <b>{m.label}</b><span>{m.size} players each</span><small>{m.blurb}</small>
              </button>
            ))}
          </div>
          {!isHost && <p className="muted">The host picks the format.</p>}
          <ul className="rules">
            <li>Everyone starts with <b>{fmtM(BUDGET)}</b>.</li>
            <li>Each lot runs <b>20s</b>. A bid in the last 5s resets the clock to <b>8s</b>.</li>
            <li>You must keep <b>£5M</b> for every empty slot, so you can always finish your squad.</li>
            <li>Pass on a player you don’t want. When everyone else passes, the hammer drops early.</li>
          </ul>
        </section>
      </div>

      {r.error && <p className="err center">{r.error}</p>}
      <div className="lobby-actions">
        {isHost
          ? <button className="btn primary big" disabled={!!why} onClick={() => { Sound.init(); r.start(); }}><Play size={20} /> Start the auction</button>
          : <button className={`btn big ${me.ready ? '' : 'primary'}`} onClick={() => { Sound.init(); r.ready(!me.ready); }}>{me.ready ? <><Check size={20} /> Ready! (tap to undo)</> : <><Hourglass size={20} /> I’m ready</>}</button>}
        <button className="btn" onClick={r.leave}><LogOut size={18} /> Leave</button>
      </div>
      <p className="muted center">{why || (isHost ? 'Everyone’s in. Start when you like.' : 'Waiting for the host to start.')}</p>
    </div>
  );
}
