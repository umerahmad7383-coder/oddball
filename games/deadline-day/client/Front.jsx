import React, { useEffect, useState } from 'react';
import { Gavel, Users, Trophy, Copy, Check, Share2, LogOut, Crown, Hourglass, Play, WifiOff, Link as LinkIcon, Loader2, Camera, X } from 'lucide-react';
import { inviteLink, readJoinCode } from '../../../platform/client/useRoom.js';
import { MODES, BUDGET, MAX_PLAYERS, MIN_PLAYERS, fmtM } from '../shared/rules.js';
import { PlayerCard, Sound, usePhotos } from './ui.jsx';
import { BY_ID } from '../shared/players.js';

const NAME_KEY = 'oddball.name';
export const savedName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } };
const saveName = (n) => { try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* ignore */ } };
const SHOWCASE = ['lamine-yamal', 'kylian-mbappe', 'erling-haaland'];

/* A deadline clock that's always a few minutes from 23:00. */
function DeadlineClock() {
  const [s, setS] = useState(5 * 60 - 13);
  useEffect(() => { const id = setInterval(() => setS((x) => (x <= 0 ? 5 * 60 : x - 1)), 1000); return () => clearInterval(id); }, []);
  const left = 23 * 3600 - s, hh = Math.floor(left / 3600), mm = Math.floor((left % 3600) / 60), ss = left % 60;
  return <div className="dl-clock" aria-hidden="true"><span>{String(hh).padStart(2, '0')}</span>:<span>{String(mm).padStart(2, '0')}</span>:<span>{String(ss).padStart(2, '0')}</span></div>;
}

function Credits({ onClose }) {
  const [text, setText] = useState('Loading…');
  useEffect(() => { fetch('/photos/credits.txt').then((r) => (r.ok ? r.text() : 'No credits file found.')).then(setText).catch(() => setText('Couldn’t load the credits.')); }, []);
  return (
    <div className="modal" role="dialog" aria-label="Photo credits" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>Photo credits</b><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <pre>{text}</pre>
      </div>
    </div>
  );
}

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
  const photos = usePhotos();
  const [credits, setCredits] = useState(false);
  return (
    <div className="landing">
      <section className="hero">
        <div className="floodlight l" aria-hidden="true" /><div className="floodlight r" aria-hidden="true" />
        <div className="hero-copy">
          <span className="breaking-chip big">BREAKING</span>
          <h1 className="dd-title"><span>DEADLINE</span><span>DAY</span></h1>
          <DeadlineClock />
          <p className="land-sub">The window slams shut at 23:00. You’ve got {fmtM(BUDGET)}. Outbid your mates for the best XI.</p>
        </div>
        <div className="hero-cards" aria-hidden="true">
          {SHOWCASE.map((id, i) => BY_ID[id] && <div key={id} className={`hc hc${i}`}><PlayerCard f={BY_ID[id]} size="md" /></div>)}
          <div className="hero-sticker">HERE WE GO!</div>
        </div>
      </section>
      <section className="land-panel">
        {r.resolved || !readJoinCode() ? null : <p className="dim flex items-center gap-2"><Loader2 size={14} className="spin" /> Finding your room…</p>}
        <label className="field"><span>Your manager name</span>
          <input value={name} maxLength={16} placeholder="e.g. Sir Alex" onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn bid-main" disabled={!ok} onClick={() => go((n) => r.create(n))}><Gavel size={22} /> START AN AUCTION</button>
        <div className="or"><span>or join a room</span></div>
        <div className="join-row">
          <input className="code" value={code} maxLength={6} placeholder="CODE" spellCheck={false} autoCapitalize="characters"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
          <button className="btn ghost" disabled={!ok} onClick={join}><LinkIcon size={18} /> Join</button>
        </div>
        {r.error && <p className="err">{r.error}</p>}
        {!ok && <p className="dim flex items-center gap-2"><Loader2 size={14} className="spin" /> {r.conn === 'reconnecting' ? 'Can’t reach the server, retrying…' : 'Connecting…'}</p>}
      </section>
      <ol className="how">
        <li><b>1</b><div><strong>Bid live</strong><span>Real footballers go under the hammer. 20 seconds a lot, and late bids add time. Set an auto-bid limit if you’re busy plotting.</span></div></li>
        <li><b>2</b><div><strong>Build your XI</strong><span>Every signing drops onto your pitch. Clubmates, compatriots and league-mates link up for chemistry.</span></div></li>
        <li><b>3</b><div><strong>Best squad wins</strong><span>85% average rating, 15% chemistry. Out-of-position players lose rating, so plan ahead.</span></div></li>
      </ol>
      {photos.credits && <button className="link-btn" onClick={() => setCredits(true)}><Camera size={14} /> Photo credits</button>}
      {credits && <Credits onClose={() => setCredits(false)} />}
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
        {copied === 'fail' && <p className="dim">Couldn’t copy. Send this link: {inviteLink(room.code)}</p>}
      </div>

      <div className="lobby-grid">
        <section className="panel">
          <h2>Managers <span className="count">{players.length}/{MAX_PLAYERS}</span></h2>
          <div className="mgr-list">
            {players.map((p) => (
              <div key={p.id} className={`mgr ${p.id === me.id ? 'me' : ''} ${p.connected ? '' : 'off'}`} style={{ '--c': p.color }}>
                <span className="crest">{p.name.slice(0, 1).toUpperCase()}</span>
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
          {!isHost && <p className="dim">The host picks the format.</p>}
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
          ? <button className="btn bid-main wide" disabled={!!why} onClick={() => { Sound.init(); r.start(); }}><Play size={22} /> OPEN THE WINDOW</button>
          : <button className={`btn wide ${me.ready ? 'ghost' : 'bid-main'}`} onClick={() => { Sound.init(); r.ready(!me.ready); }}>{me.ready ? <><Check size={20} /> Ready! (tap to undo)</> : <><Hourglass size={20} /> I’M READY</>}</button>}
        <button className="btn ghost" onClick={r.leave}><LogOut size={18} /> Leave</button>
      </div>
      <p className="dim center">{why || (isHost ? 'Everyone’s in. Start when you like.' : 'Waiting for the host to start.')}</p>
    </div>
  );
}
