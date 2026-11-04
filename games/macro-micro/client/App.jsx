import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Minus, Plus, Volume2, VolumeX, RotateCcw, Play, Flag, ArrowRight, Copy, Home } from 'lucide-react';
import { Stage } from './Stage.jsx';
import { STEPS, START, WRONG_PENALTY, DIFFICULTY, zoomAt, scoreFor, roundScore, titleFor } from '../shared/scoring.js';
import { api, recordPlay } from '../../../platform/client/api.js';
import { GameSponsorNote } from '../../../platform/client/promo.jsx';

const SAVE_KEY = 'oddball.macro.v1';       // bests, totals, sound setting
const RUN_KEY = 'oddball.macro.run.v1';    // the game in progress, so a refresh doesn't lose it
const ROUNDS = 10;
const MODES = {
  classic: { name: 'Classic', blurb: 'Ten rounds, easy to hard.', plan: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3] },
  easy: { name: 'Easy', blurb: 'Ten friendlier photos.', plan: Array(ROUNDS).fill(1) },
  hard: { name: 'Hard', blurb: 'Ten very strange textures.', plan: Array(ROUNDS).fill(3) },
  endless: { name: 'Endless', blurb: 'Keep going. Three strikes and you’re out.', endless: true },
};
const STRIKE_BELOW = 300; // in Endless, a round worth less than this (or a give-up) is a strike
const BUTTON_STEP = 60;

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: play on */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const defaults = () => ({ best: {}, games: 0, rounds: 0, muted: false });
const imgUrl = (o, kind) => `/api/macro/img/${o.id}/${kind}?v=${o.v}`;
const fmtZoom = (z) => `${z < 10 ? z.toFixed(1) : Math.round(z)}×`;
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/* tiny synthesised sounds: no audio files, nothing to license */
const Sound = {
  ctx: null, muted: false,
  play(kind) {
    if (this.muted) return;
    try {
      const c = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const tone = (f, d, type = 'sine', vol = 0.05, at = 0) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, c.currentTime + at); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + d); o.connect(g); g.connect(c.destination); o.start(c.currentTime + at); o.stop(c.currentTime + at + d); };
      if (kind === 'tick') tone(1800, 0.03, 'triangle', 0.015);
      if (kind === 'right') [660, 880, 1320].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, i * 0.07));
      if (kind === 'wrong') tone(180, 0.2, 'square', 0.03);
      if (kind === 'warm') tone(520, 0.12, 'sine', 0.04);
      if (kind === 'done') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.05, i * 0.1));
    } catch (e) { /* no audio */ }
  },
};

/** Plans the photos for a run, by difficulty, never repeating within a run. */
function planRun(mode, pool) {
  const bag = { 1: shuffle(pool.filter((o) => o.difficulty === 1)), 2: shuffle(pool.filter((o) => o.difficulty === 2)), 3: shuffle(pool.filter((o) => o.difficulty === 3)) };
  const take = (d) => { for (const k of [d, d === 1 ? 2 : d === 3 ? 2 : 1, d === 3 ? 1 : 3]) if (bag[k].length) return bag[k].pop(); return null; };
  if (MODES[mode].endless) return shuffle(pool).map((o) => o.id);
  return MODES[mode].plan.map(take).filter(Boolean).map((o) => o.id);
}
const endlessDifficulty = (round) => (round < 4 ? 1 : round < 9 ? 2 : 3);

function useCountUp(value, ms = 450) {
  const [v, setV] = useState(value); const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value; let id;
    const f = (t) => { const k = Math.min(1, (t - start) / ms); const e = 1 - Math.pow(1 - k, 3); setV(Math.round(a + (b - a) * e)); if (k < 1) id = requestAnimationFrame(f); else from.current = b; };
    id = requestAnimationFrame(f);
    return () => { cancelAnimationFrame(id); from.current = b; };
  }, [value]);
  return v;
}

export default function App() {
  const [save, setSave] = useState(() => ({ ...defaults(), ...store.get(SAVE_KEY, {}) }));
  const [pool, setPool] = useState(null);       // playable objects from the server
  const [loadErr, setLoadErr] = useState('');
  const [run, setRun] = useState(null);         // { mode, queue, idx, results[], strikes }
  const [screen, setScreen] = useState('menu'); // menu | intro | play | reveal | final
  const [round, setRound] = useState(null);     // { obj, lowest, wrong[], target, startedAt, endedAt, practice }
  const [resume, setResume] = useState(null);
  useEffect(() => { Sound.muted = !!save.muted; store.set(SAVE_KEY, save); }, [save]);

  useEffect(() => {
    api('/api/macro/objects').then((j) => {
      setPool(j.objects);
      const r = store.get(RUN_KEY, null);
      if (r && r.mode && MODES[r.mode] && Array.isArray(r.queue) && r.queue.every((id) => j.objects.some((o) => o.id === id))) setResume(r);
    }).catch((e) => setLoadErr(e.status === 503 ? 'The photo library is starting up. Try again in a moment.' : e.message));
  }, []);
  const byId = useMemo(() => Object.fromEntries((pool || []).map((o) => [o.id, o])), [pool]);

  // keep the run in sessionless localStorage so a refresh resumes exactly where it was, points lost and all
  useEffect(() => {
    if (!run || screen === 'final') return;
    store.set(RUN_KEY, { ...run, current: round && !round.practice ? { id: round.obj.id, lowest: round.lowest, wrong: round.wrong, done: !!round.result, result: round.result || null, elapsed: round.endedAt ? round.endedAt - round.startedAt : Date.now() - round.startedAt } : null, screen });
  }, [run, round, screen]);

  const startRun = (mode) => {
    const queue = planRun(mode, pool);
    if (!queue.length) return;
    store.del(RUN_KEY);
    setRun({ mode, queue, idx: 0, results: [], strikes: 0 });
    prepareRound(queue[0], false);
    setResume(null);
  };
  const continueRun = () => {
    const r = resume; setResume(null);
    setRun({ mode: r.mode, queue: r.queue, idx: r.idx, results: r.results || [], strikes: r.strikes || 0 });
    const c = r.current;
    if (c && c.done && c.result) { prepareRound(r.queue[r.idx], false, c); setScreen('reveal'); }
    else prepareRound(r.queue[r.idx], false, c);
  };
  const prepareRound = (id, practice, restored) => {
    const obj = byId[id] || (pool || []).find((o) => o.id === id);
    const lowest = restored && restored.lowest != null ? Math.max(0, Math.min(STEPS, restored.lowest)) : STEPS;
    setRound({ obj, lowest, target: lowest, wrong: restored ? restored.wrong || [] : [], startedAt: Date.now() - (restored ? restored.elapsed || 0 : 0), endedAt: null, practice, result: restored && restored.result ? restored.result : null, restored: !!restored });
    setScreen(restored && !restored.done ? 'play' : 'intro');
  };
  const skipBroken = () => { // a photo that won't load is replaced; nobody loses points for our problem
    if (!run) { setScreen('menu'); return; }
    const used = new Set(run.queue);
    const spare = shuffle((pool || []).filter((o) => !used.has(o.id) && o.difficulty === round.obj.difficulty).concat((pool || []).filter((o) => !used.has(o.id))))[0];
    if (!spare) { nextRound(true); return; }
    const queue = run.queue.slice(); queue[run.idx] = spare.id;
    setRun({ ...run, queue }); prepareRound(spare.id, false);
  };

  const finishRound = (result) => {
    setRound((r) => (r.result ? r : { ...r, endedAt: Date.now(), result }));
    setScreen('reveal');
  };
  const recordResult = useCallback(() => {
    if (!round || !round.result || round.practice || !run) return run;
    if (run.results.some((x) => x.idx === run.idx)) return run; // never count a round twice
    const res = { idx: run.idx, id: round.obj.id, name: round.result.reveal.name, score: round.result.score, zoom: zoomAt(round.lowest, round.obj.startZoom), gaveUp: round.result.gaveUp, wrong: round.wrong.length, secs: Math.round((round.endedAt - round.startedAt) / 1000) };
    const strike = MODES[run.mode].endless && (res.gaveUp || res.score < STRIKE_BELOW);
    const next = { ...run, results: [...run.results, res], strikes: run.strikes + (strike ? 1 : 0) };
    setRun(next);
    return next;
  }, [round, run]);
  useEffect(() => { if (screen === 'reveal') recordResult(); }, [screen]);

  const nextRound = (skipCurrent) => {
    const r = run; if (!r) return;
    const over = MODES[r.mode].endless ? r.strikes >= 3 : r.idx + 1 >= r.queue.length;
    if (over && !skipCurrent) { finishRun(r); return; }
    let queue = r.queue;
    if (MODES[r.mode].endless) {
      const want = endlessDifficulty(r.idx + 1);
      const seen = new Set(r.queue.slice(0, r.idx + 1));
      const fresh = shuffle(pool.filter((o) => !seen.has(o.id)));
      const pick = fresh.find((o) => o.difficulty === want) || fresh[0] || shuffle(pool)[0];
      queue = r.queue.slice(0, r.idx + 1).concat(pick.id);
    }
    if (r.idx + 1 >= queue.length) { finishRun(r); return; }
    const n = { ...r, queue, idx: r.idx + 1 };
    setRun(n); prepareRound(queue[n.idx], false);
  };
  const finishRun = (r) => {
    const total = r.results.reduce((t, x) => t + x.score, 0);
    const avg = r.results.length ? Math.round(total / r.results.length) : 0;
    const prev = save.best[r.mode];
    const better = MODES[r.mode].endless ? !prev || r.results.length > prev.rounds || (r.results.length === prev.rounds && total > prev.total) : !prev || total > prev.total;
    setSave((s) => ({ ...s, games: s.games + 1, rounds: s.rounds + r.results.length, best: { ...s.best, [r.mode]: better ? { total, avg, rounds: r.results.length, at: Date.now() } : prev } }));
    setRun({ ...r, final: { total, avg, better, prev } });
    store.del(RUN_KEY);
    recordPlay('macro-micro', { score: total, meta: { mode: r.mode, rounds: r.results.length, avg } });
    setScreen('final'); Sound.play('done');
  };
  const practiceAgain = () => { prepareRound(round.obj.id, true); };
  const toMenu = () => { if (run && screen !== 'final' && !window.confirm('Leave this game? Your progress will be lost.')) return; store.del(RUN_KEY); setRun(null); setRound(null); setScreen('menu'); };

  // admins can test a single photo from the picker with ?try=<id> (practice: nothing is saved)
  useEffect(() => {
    if (!pool) return;
    const id = new URLSearchParams(window.location.search).get('try');
    if (id && byId[id]) prepareRound(id, true);
  }, [pool]);

  const header = (
    <header className="mm-bar">
      <a className="mm-back" href="/" onClick={(e) => { if (run && screen !== 'final' && screen !== 'menu' && !window.confirm('Leave this game? Your progress will be lost.')) e.preventDefault(); }}><ArrowLeft size={17} /> oddball</a>
      <button className="mm-title" onClick={() => (screen === 'menu' ? null : toMenu())}>MACRO<span>/</span>MICRO</button>
      <div className="mm-right">
        {run && screen !== 'menu' && screen !== 'final' && <span className="mm-round">{MODES[run.mode].endless ? `Round ${run.idx + 1} · ${'●'.repeat(run.strikes)}${'○'.repeat(Math.max(0, 3 - run.strikes))}` : `${run.idx + 1} / ${run.queue.length}`}</span>}
        <button className="mm-icon" onClick={() => setSave((s) => ({ ...s, muted: !s.muted }))} aria-label={save.muted ? 'Sound on' : 'Sound off'}>{save.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
      </div>
    </header>
  );

  if (screen === 'menu') {
    const n = pool ? pool.length : 0;
    return (
      <div className="mm">
        {header}
        <main className="menu">
          <div className="menu-hero">
            <h1>Macro<span>/</span>Micro</h1>
            <p>A photo, zoomed in until it makes no sense. Zoom out until you know what it is.<br />The less you need to see, the more you score.</p>
          </div>
          {loadErr && <p className="mm-note bad">{loadErr}</p>}
          {!pool && !loadErr && <p className="mm-note">Loading the photo library…</p>}
          {pool && n === 0 && <p className="mm-note">No photos have been added yet. An admin can add them at <a href="/macro-micro/curate">/macro-micro/curate</a>.</p>}
          {resume && (
            <div className="resume">
              <p><b>You’re in the middle of a {MODES[resume.mode].name} game</b>, round {resume.idx + 1}{MODES[resume.mode].endless ? '' : ` of ${resume.queue.length}`}.</p>
              <div><button className="btn-main" onClick={continueRun}><Play size={16} /> Carry on</button><button className="btn-line" onClick={() => { store.del(RUN_KEY); setResume(null); }}>Start fresh</button></div>
            </div>
          )}
          {pool && n > 0 && (
            <div className="modes">
              {Object.entries(MODES).map(([k, m]) => {
                const b = save.best[k];
                return (
                  <button key={k} className={`mode m-${k}`} onClick={() => startRun(k)}>
                    <b>{m.name}</b><span>{m.blurb}</span>
                    <small>{b ? (m.endless ? `Best: ${b.rounds} rounds, ${b.total.toLocaleString()} pts` : `Best: ${b.total.toLocaleString()} (${titleFor(b.avg)})`) : 'Not played yet'}</small>
                  </button>
                );
              })}
            </div>
          )}
          <ol className="how">
            <li><b>Zoom out</b> with the slider, your mouse wheel or a pinch.</li>
            <li><b>Type a guess</b> whenever you think you know. Close but vague guesses are free.</li>
            <li>You start each round with <b>{START.toLocaleString()} points</b>. The furthest you zoom out decides what’s left. Zooming back in won’t give them back.</li>
          </ol>
          <p className="mm-foot">{n > 0 ? `${n} photos in the library.` : ''} {save.games > 0 ? `You’ve played ${save.games} game${save.games === 1 ? '' : 's'}.` : ''} <a href="/macro-micro/credits">Photo credits</a></p>
          <GameSponsorNote game="macro-micro" />
        </main>
      </div>
    );
  }

  if (screen === 'final' && run && run.final) return <Final run={run} header={header} onAgain={() => startRun(run.mode)} onMenu={() => { setRun(null); setRound(null); setScreen('menu'); }} />;
  if (!round || !round.obj) return <div className="mm">{header}<main className="menu"><p className="mm-note">Loading…</p></main></div>;
  return <Round key={`${round.obj.id}-${round.practice ? 'p' : run ? run.idx : 0}-${round.startedAt}`} round={round} setRound={setRound} run={run} screen={screen} setScreen={setScreen} header={header}
    onFinish={finishRound} onNext={() => nextRound(false)} onPractice={practiceAgain} onMenu={toMenu} onBroken={skipBroken} />;
}

function Round({ round, setRound, run, screen, setScreen, header, onFinish, onNext, onPractice, onMenu, onBroken }) {
  const o = round.obj, diff = DIFFICULTY[o.difficulty];
  const [guess, setGuess] = useState(''), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [broken, setBroken] = useState(false), [ready, setReady] = useState(false), [now, setNow] = useState(Date.now());
  const input = useRef(null), lastTick = useRef(round.target);
  const playing = screen === 'play' && !round.result;
  const potential = Math.max(0, scoreFor(round.lowest, o.difficulty) - WRONG_PENALTY * round.wrong.length);
  const shownScore = useCountUp(round.result ? round.result.score : potential);
  const z = zoomAt(round.target, o.startZoom);

  useEffect(() => { if (!playing) return undefined; const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, [playing]);
  useEffect(() => { if (playing && input.current && window.matchMedia('(pointer: fine)').matches) input.current.focus(); }, [playing]);

  // every zoom input funnels through here: clamp, remember the furthest point out, tick quietly
  const onTarget = useCallback((fn) => {
    setRound((r) => {
      if (r.result) return r;
      const t = Math.max(0, Math.min(STEPS, typeof fn === 'function' ? fn(r.target) : fn));
      if (Math.abs(t - lastTick.current) > 45) { lastTick.current = t; Sound.play('tick'); }
      return { ...r, target: t, lowest: Math.min(r.lowest, t) };
    });
  }, [setRound]);

  // when a round ends, the photo pulls all the way out to show the whole object
  useEffect(() => {
    if (screen !== 'reveal') return undefined;
    const start = performance.now(), from = round.target; let id;
    const f = (t) => { const k = Math.min(1, (t - start) / 1400); const e = 1 - Math.pow(1 - k, 3); setRound((r) => ({ ...r, target: from * (1 - e) })); if (k < 1) id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, [screen]);

  useEffect(() => {
    if (!playing) return undefined;
    const key = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (e.key === '-' || e.key === '_') onTarget((s) => s - BUTTON_STEP);
      if (e.key === '=' || e.key === '+') onTarget((s) => s + BUTTON_STEP);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [playing, onTarget]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !playing) return;
    const g = guess.trim();
    if (!g) { setMsg({ k: 'info', t: 'Type what you think it is first.' }); return; }
    const norm = g.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (round.wrong.includes(norm)) { setMsg({ k: 'info', t: 'You already tried that one.' }); return; }
    setBusy(true);
    try {
      const j = await api('/api/macro/guess', { method: 'POST', body: { id: o.id, guess: g } });
      if (j.result === 'correct') {
        Sound.play('right');
        const score = roundScore(round.lowest, o.difficulty, round.wrong.length);
        onFinish({ reveal: j.reveal, score, gaveUp: false, guess: g });
      } else if (j.result === 'close') { Sound.play('warm'); setMsg({ k: 'warm', t: `Warmer… “${g}” is on the right track. Be more specific.` }); }
      else { Sound.play('wrong'); setRound((r) => ({ ...r, wrong: [...r.wrong, norm] })); setMsg({ k: 'bad', t: `It’s not ${/^[aeiou]/i.test(g) ? 'an' : 'a'} ${g}. −${WRONG_PENALTY}` }); setGuess(''); }
    } catch (x) { setMsg({ k: 'bad', t: 'Couldn’t check that guess. Try again.' }); }
    finally { setBusy(false); }
  };
  const giveUp = async () => {
    if (busy || !playing) return;
    if (!window.confirm('Give up and see the answer? This round scores 0.')) return;
    setBusy(true);
    try { const j = await api('/api/macro/reveal', { method: 'POST', body: { id: o.id } }); onFinish({ reveal: j.reveal, score: 0, gaveUp: true }); }
    catch (x) { setMsg({ k: 'bad', t: 'Couldn’t reach the server. Try again.' }); }
    finally { setBusy(false); }
  };

  const secs = Math.floor(((round.endedAt || now) - round.startedAt) / 1000);
  const res = round.result;
  return (
    <div className={`mm s-${screen}`}>
      {header}
      <main className="game">
        <div className="stage-col">
          <Stage obj={o} fullSrc={imgUrl(o, 'full')} detailSrc={imgUrl(o, 'detail')} target={round.target} onTarget={onTarget} locked={!playing}
            onLoad={() => setReady(true)} onError={() => setBroken(true)}>
            <div className="hud hud-l"><span className="mag">{fmtZoom(z)}</span></div>
            <div className={`hud hud-r ${res ? (res.gaveUp ? 'zero' : 'won') : ''}`}><span className="pts">{shownScore.toLocaleString()}</span><small>{res ? 'points' : 'on offer'}</small></div>
            {screen === 'intro' && (
              <div className="veil">
                <div className="intro">
                  <small>{round.practice ? 'Practice · doesn’t count' : run && MODES[run.mode].endless ? `Round ${run.idx + 1}` : `Round ${run ? run.idx + 1 : 1} of ${run ? run.queue.length : 1}`} · {diff.name}</small>
                  <h2>What is this?</h2>
                  <p>{START.toLocaleString()} points. Zoom out as little as you dare.</p>
                  {run && run.results.length > 0 && <p className="sofar">So far: {run.results.reduce((t, x) => t + x.score, 0).toLocaleString()} points</p>}
                  <button className="btn-main" disabled={!ready} onClick={() => { setRound((r) => ({ ...r, startedAt: Date.now() })); setScreen('play'); }}>{ready ? <><Play size={16} /> Start</> : 'Developing photo…'}</button>
                </div>
              </div>
            )}
            {broken && (
              <div className="veil"><div className="intro"><h2>This photo won’t load.</h2><p>Not your fault, and it won’t cost you anything.</p><button className="btn-main" onClick={onBroken}>Use a different photo</button></div></div>
            )}
          </Stage>
        </div>

        {screen === 'play' && (
          <div className="controls">
            <div className="zoomrow">
              <button className="zbtn" onClick={() => onTarget((s) => s - BUTTON_STEP)} aria-label="Zoom out" disabled={round.target <= 0}><Minus size={20} /></button>
              <label className="slider"><span className="sr-only">Zoom</span>
                <input type="range" min="0" max={STEPS} step="1" value={Math.round(round.target)} onChange={(e) => onTarget(Number(e.target.value))} aria-valuetext={`${fmtZoom(z)} magnification`} />
                <span className="lowmark" style={{ left: `${(round.lowest / STEPS) * 100}%` }} title="Furthest you’ve zoomed out" />
              </label>
              <button className="zbtn" onClick={() => onTarget((s) => s + BUTTON_STEP)} aria-label="Zoom in" disabled={round.target >= STEPS}><Plus size={20} /></button>
            </div>
            <div className="scale"><span>1×</span><span>zoom out ← → zoom in</span><span>{fmtZoom(o.startZoom)}</span></div>
            <form className="guessrow" onSubmit={submit}>
              <input ref={input} type="text" value={guess} onChange={(e) => { setGuess(e.target.value); if (msg && msg.k !== 'bad') setMsg(null); }} placeholder="What is it?" maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-label="Your guess" />
              <button className="btn-main" disabled={busy}>Lock in</button>
            </form>
            <div className="belowrow">
              <p className={`msg ${msg ? msg.k : ''}`} role="status" aria-live="polite">{msg ? msg.t : round.wrong.length ? `${round.wrong.length} wrong guess${round.wrong.length > 1 ? 'es' : ''} so far (−${WRONG_PENALTY * round.wrong.length}).` : `Each wrong guess costs ${WRONG_PENALTY}.`}</p>
              <span className="timer" aria-label={`${secs} seconds`}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
              <button className="btn-quiet" onClick={giveUp} disabled={busy}><Flag size={14} /> Give up</button>
            </div>
          </div>
        )}

        {screen === 'reveal' && res && (
          <div className="reveal">
            <small className="cat">{res.reveal.category}</small>
            <h2>{res.gaveUp ? <>It was a <em>{res.reveal.name.toLowerCase()}</em>.</> : <>{res.reveal.name}!</>}</h2>
            {!res.gaveUp && <p className="howfar">You knew it at <b>{fmtZoom(zoomAt(round.lowest, o.startZoom))}</b>{round.wrong.length ? `, after ${round.wrong.length} wrong guess${round.wrong.length > 1 ? 'es' : ''}` : ''}, in {secs}s.</p>}
            <div className="tally"><div><b>{res.score.toLocaleString()}</b><small>points</small></div><div><b>{(START - res.score).toLocaleString()}</b><small>lost</small></div></div>
            <p className="fact">{res.reveal.fact}</p>
            {res.reveal.credit && <p className="credit">Photo: {res.reveal.credit.author} · {res.reveal.credit.licenseUrl ? <a href={res.reveal.credit.licenseUrl} target="_blank" rel="noreferrer">{res.reveal.credit.license}</a> : res.reveal.credit.license}{res.reveal.credit.sourceUrl && <> · <a href={res.reveal.credit.sourceUrl} target="_blank" rel="noreferrer">Wikimedia Commons</a></>}</p>}
            <div className="actions">
              {round.practice ? <button className="btn-main" onClick={onMenu}><Home size={16} /> Menu</button> : <button className="btn-main" onClick={onNext} autoFocus>{run && (MODES[run.mode].endless ? run.strikes >= 3 : run.idx + 1 >= run.queue.length) ? 'See results' : 'Next photo'} <ArrowRight size={16} /></button>}
              <button className="btn-line" onClick={onPractice}><RotateCcw size={15} /> Try this one again{round.practice ? '' : ' (practice)'}</button>
              {!round.practice && <button className="btn-quiet" onClick={onMenu}>Menu</button>}
            </div>
            {run && MODES[run.mode].endless && !round.practice && (res.gaveUp || res.score < STRIKE_BELOW) && <p className="strike">Strike {run.strikes} of 3. Score at least {STRIKE_BELOW} to avoid one.</p>}
          </div>
        )}
      </main>
    </div>
  );
}

function Final({ run, header, onAgain, onMenu }) {
  const { total, avg, better, prev } = run.final;
  const shown = useCountUp(total, 900);
  const [copied, setCopied] = useState(false);
  const endless = MODES[run.mode].endless;
  const share = async () => {
    const line = run.results.map((r) => (r.gaveUp ? '⬛' : r.score >= 750 ? '🟩' : r.score >= 400 ? '🟨' : '🟧')).join('');
    try { await navigator.clipboard.writeText(`Macro / Micro (${MODES[run.mode].name}): ${total.toLocaleString()} points. ${titleFor(avg)}.\n${line}\n${window.location.origin}/macro-micro/`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { /* ignore */ }
  };
  return (
    <div className="mm s-final">
      {header}
      <main className="final">
        <small>{MODES[run.mode].name}{endless ? ` · ${run.results.length} rounds` : ''}</small>
        <h1>{shown.toLocaleString()}</h1>
        <p className="title">{titleFor(avg)}</p>
        <p className="avg">{avg.toLocaleString()} points a photo on average{better ? ' · new personal best!' : prev ? ` · your best is ${prev.total.toLocaleString()}` : ''}</p>
        <ol className="rounds">
          {run.results.map((r) => (
            <li key={r.idx}>
              <img src={`/api/macro/img/${r.id}/thumb`} alt="" loading="lazy" />
              <span className="rn">{r.name}</span>
              <span className="rz">{r.gaveUp ? 'gave up' : `at ${fmtZoom(r.zoom)}`}</span>
              <b>{r.score.toLocaleString()}</b>
            </li>
          ))}
        </ol>
        <div className="actions">
          <button className="btn-main" onClick={onAgain}><RotateCcw size={16} /> Play again</button>
          <button className="btn-line" onClick={share}><Copy size={15} /> {copied ? 'Copied!' : 'Copy result'}</button>
          <button className="btn-quiet" onClick={onMenu}>Menu</button>
        </div>
      </main>
    </div>
  );
}
