/* oddball platform — React hook that connects a game page to its room server.
 * Handles connecting, resuming after a reload, create/join/leave, lobby actions and the
 * ?join=CODE invite link. Games read `room.state` for their own game state. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Net, wsUrl } from './net.js';

export function readJoinCode() {
  try { return (new URLSearchParams(window.location.search).get('join') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); } catch (e) { return ''; }
}
export function setJoinCode(code) {
  try {
    const u = new URL(window.location.href);
    if (code) u.searchParams.set('join', code); else u.searchParams.delete('join');
    window.history.replaceState(null, '', u.toString());
  } catch (e) { /* ignore */ }
}
export const inviteLink = (code) => `${window.location.origin}${window.location.pathname}?join=${code}`;

export function useRoom(gameId, { onEvent } = {}) {
  const net = useMemo(() => new Net(wsUrl(gameId)), [gameId]);
  const [conn, setConn] = useState('idle');
  const [room, setRoom] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState('');
  const [resolved, setResolved] = useState(false);
  const [feed, setFeed] = useState([]);
  const roomRef = useRef(null); roomRef.current = room;
  const evRef = useRef(onEvent); evRef.current = onEvent;

  useEffect(() => {
    const offs = [
      net.on('status', (m) => setConn(m.status)),
      net.on('joined', (m) => { setMeId(m.pid); setError(''); setJoinCode(m.code); setResolved(true); }),
      net.on('room', (m) => setRoom(m.room)),
      net.on('noroom', () => { setResolved(true); if (roomRef.current) setError('That room has closed. The server may have restarted.'); setRoom(null); setMeId(null); }),
      net.on('left', () => { setRoom(null); setMeId(null); setJoinCode(null); }),
      net.on('error', (m) => setError(m.msg || 'Something went wrong.')),
      net.on('feed', (m) => { const id = Math.random(); setFeed((f) => [...f.slice(-5), { id, ...m }]); setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 5000); }),
      net.on('ev', (m) => evRef.current && evRef.current(m.ev)),
    ];
    net.connect();
    return () => { offs.forEach((o) => o()); net.close(); };
  }, [net]);

  const me = room && room.players.find((p) => p.id === meId);
  const send = (m) => net.send(m);
  return {
    net, conn, room, me, meId, error, setError, resolved, feed,
    isHost: !!(room && me && room.hostId === me.id),
    create: (name) => { setError(''); send({ t: 'create', name }); },
    join: (code, name) => { setError(''); send({ t: 'join', code, name }); },
    leave: () => { send({ t: 'leave' }); setJoinCode(null); },
    ready: (ready) => send({ t: 'ready', ready }),
    settings: (settings) => send({ t: 'settings', settings }),
    start: () => { setError(''); send({ t: 'start' }); },
    rematch: () => send({ t: 'rematch' }),
    send,
  };
}
