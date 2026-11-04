import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Coins, Users, Smile, Leaf, Car, GraduationCap, PiggyBank, Newspaper, RotateCcw, Copy, Dice5 } from 'lucide-react';
import { TURNS, PROJECTS, newNation, offers, pickEvent, build, resolve, score, title, motto, consequences, flagFor, lockedProjects } from '../logic/sim.js';
import { Island, Flag } from './Island.jsx';
import { GameSponsorNote } from '../../../platform/client/promo.jsx';
import { recordPlay } from '../../../platform/client/api.js';

const BEST_KEY = 'oddball.nation.best';       // unchanged from earlier versions
const SAVE_KEY = 'oddball.nation.save.v1';    // an unfinished nation
const LAST_KEY = 'oddball.nation.last';       // the previous finished nation, for comparison
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const validSave = (x) => x && x.s && x.s.v === 2 && typeof x.phase === 'string' && x.phase !== 'end';
const SYL = ['Bo', 'Zan', 'Mer', 'Quo', 'Lu', 'Fen', 'Dra', 'Pim', 'Ska', 'Vel', 'Or', 'Tum', 'Gli', 'Nor', 'Wib', 'Ara'];
const ENDS = ['ia', 'land', 'stan', 'ovia', 'shire', 'opolis', 'ton', 'mark'];
const randomName = () => SYL[Math.floor(Math.random() * SYL.length)] + SYL[Math.floor(Math.random() * SYL.length)].toLowerCase() + ENDS[Math.floor(Math.random() * ENDS.length)];
const META = {
  money: { label: 'Treasury', icon: Coins, fmt: (v) => `£${Math.round(v)}k`, color: '#ffb703' },
  pop: { label: 'People', icon: Users, fmt: (v) => Math.round(v).toLocaleString(), color: '#8f6cff' },
  happy: { label: 'Happiness', icon: Smile, fmt: (v) => Math.round(v), color: '#ff6b57', bar: true },
  green: { label: 'Nature', icon: Leaf, fmt: (v) => Math.round(v), color: '#2fbf71', bar: true },
  commute: { label: 'Commute', icon: Car, fmt: (v) => `${Math.round(v)} min`, color: '#5b6b7f', bar: true, max: 90, bad: true },
  smart: { label: 'Education', icon: GraduationCap, fmt: (v) => Math.round(v), color: '#2f9bff', bar: true },
};
const FX_NAMES = { money: '£k', happy: 'happy', green: 'nature', commute: 'min commute', smart: 'education', income: '£k/yr', cap: 'homes' };
function Chips({ fx }) {
  return <div className="chips">{Object.entries(fx).map(([k, v]) => {
    const good = k === 'commute' ? v < 0 : v > 0;
    return <span key={k} className={good ? 'up' : 'down'}>{v > 0 ? '+' : ''}{v} {FX_NAMES[k] || k}</span>;
  })}</div>;
}

function Meters({ s, report }) {
  return (
    <div className="meters">
      {Object.entries(META).map(([k, m]) => {
        const Icon = m.icon, d = report && report.deltas[k];
        return (
          <div key={k} className="meter" style={{ '--mc': m.color }}>
            <div className="m-top"><Icon size={16} /><span>{m.label}</span><b>{m.fmt(s[k])}</b>{d ? <em className={(m.bad ? d < 0 : d > 0) ? 'up' : 'down'}>{d > 0 ? '+' : ''}{d}</em> : null}</div>
            {m.bar && <div className="m-bar"><i style={{ width: `${Math.min(100, (s[k] / (m.max || 100)) * 100)}%` }} /></div>}
            {k === 'pop' && <small>{Math.round(s.cap).toLocaleString()} homes</small>}
            {k === 'money' && s.income !== 0 && <small>{s.income > 0 ? '+' : ''}{s.income}k extra per year</small>}
          </div>
        );
      })}
    </div>
  );
}

function Chart({ history }) {
  const W = 300, H = 120, n = history.length;
  const line = (k, max) => history.map((h, i) => `${(i / Math.max(1, n - 1)) * W},${H - (Math.max(0, Math.min(max, h[k])) / max) * H}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Happiness and nature over time">
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(0,0,0,.08)" />)}
      <polyline points={line('happy', 100)} fill="none" stroke="#ff6b57" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      <polyline points={line('green', 100)} fill="none" stroke="#2fbf71" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function App() {
  const [name, setName] = useState(randomName);
  const [flagSeed, setFlagSeed] = useState(() => Math.floor(Math.random() * 2 ** 31)); // looks only, never changes the game
  const [s, setS] = useState(null);
  const [phase, setPhase] = useState('start');
  const [event, setEvent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(() => { const x = store.get(SAVE_KEY); return validSave(x) ? x : null; });
  const flag = useMemo(() => flagFor(flagSeed), [flagSeed]);
  useEffect(() => { if (s && phase !== 'start' && phase !== 'end') store.set(SAVE_KEY, { s, phase, event, flagSeed, at: Date.now() }); }, [s, phase, event]);

  const found = () => { store.del(SAVE_KEY); setS(newNation(name.trim().slice(0, 18) || 'Nowhere', Math.floor(Math.random() * 2 ** 31))); setPhase('build'); };
  const resume = () => { setS(saved.s); setPhase(saved.phase); setEvent(saved.event); setFlagSeed(saved.flagSeed); setName(saved.s.name); setSaved(null); };
  const choose = (key) => { const n = build(s, key); setS(n); setEvent(pickEvent(n)); setPhase('event'); };
  const decide = (c) => { const n = resolve(s, event, c); setS(n); setPhase('report'); };
  const next = () => { if (s.done) { finish(); } else setPhase('build'); };
  const [best, setBest] = useState(null);
  const finish = () => {
    const sc = score(s);
    let prev = null; try { prev = Number(localStorage.getItem(BEST_KEY)) || null; } catch (e) { /* ignore */ }
    if (!prev || sc > prev) { try { localStorage.setItem(BEST_KEY, String(sc)); } catch (e) { /* ignore */ } }
    const last = store.get(LAST_KEY); // read now, so a second nation in the same visit is compared too
    setBest({ sc, prev, isBest: !prev || sc > prev, last });
    store.set(LAST_KEY, { name: s.name, title: title(s), score: sc, happy: Math.round(s.happy), green: Math.round(s.green), pop: Math.round(s.pop), money: Math.round(s.money) });
    store.del(SAVE_KEY);
    recordPlay('tiny-nation', { score: sc, meta: { title: title(s).slice(0, 80) } });
    setPhase('end');
  };
  const again = () => { store.del(SAVE_KEY); setName(randomName()); setFlagSeed(Math.floor(Math.random() * 2 ** 31)); setS(null); setPhase('start'); setBest(null); };
  const share = async () => {
    const t = `${title(s)} (${motto(s)}) scored ${score(s)} on Tiny Nation. Happiness ${Math.round(s.happy)}, nature ${Math.round(s.green)}, ${Math.round(s.pop).toLocaleString()} people. ${window.location.origin}/tiny-nation/`;
    try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) { /* ignore */ }
  };

  const header = (
    <header className="tn-bar">
      <a href="/" className="tn-back"><ArrowLeft size={18} /> oddball</a>
      <b className="tn-logo">Tiny Nation</b>
      {s && phase !== 'start' ? <span className="years">{Array.from({ length: TURNS }, (_, i) => <i key={i} className={i + 1 < s.turn ? 'done' : i + 1 === s.turn && phase !== 'end' ? 'now' : ''} />)}</span> : <span />}
    </header>
  );

  if (phase === 'start') {
    return (
      <div className="tn">
        {header}
        <main className="start">
          <div className="start-card">
            {saved && (
              <div className="resume">
                <p><b>{saved.s.name}</b> is waiting for you in year {Math.min(TURNS, saved.s.turn)}.</p>
                <div className="resume-row"><button className="big-b small" onClick={resume}>Carry on</button><button className="ghost-b" onClick={() => { store.del(SAVE_KEY); setSaved(null); }}>Start fresh</button></div>
              </div>
            )}
            <p className="kicker">Congratulations. You own an island.</p>
            <h1>Build a tiny nation in ten years.</h1>
            <p>Ten years. One project a year. Your citizens will have questions.</p>
            <label className="nm"><span>Name your nation</span>
              <div className="nm-row"><input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') found(); }} /><button className="icon-b" aria-label="Random name" onClick={() => setName(randomName())}><Dice5 size={20} /></button></div>
            </label>
            <div className="flag-row"><Flag f={flag} w={96} /><button className="ghost-b" onClick={() => setFlagSeed(Math.floor(Math.random() * 2 ** 31))}><RefreshCw size={16} /> New flag</button></div>
            <button className="big-b" onClick={found}>Found {name.trim() || 'the nation'}</button>
            <small>Not a real economics model. The geese are accurate though.</small>
          </div>
          <GameSponsorNote game="tiny-nation" />
        </main>
      </div>
    );
  }

  const report = phase === 'report' ? s.lastReport : null;
  const year = Math.min(TURNS, s.turn);
  return (
    <div className="tn">
      {header}
      <main className={`board ${phase === 'end' ? 'ended' : ''}`}>
        <section className="map-col">
          <div className="map-card"><Island s={s} flag={flag} /></div>
          <Meters s={s} report={report} />
        </section>

        <section className="act-col">
          {phase === 'build' && (
            <div className="panel">
              <p className="kicker">Year {year} of {TURNS}</p>
              <h2>What should {s.name} build this year?</h2>
              <p className="sub">You have <b>£{Math.round(s.money)}k</b>. Taxes come in at the end of the year.</p>
              <div className="cards">
                {offers(s).map((k) => {
                  const p = PROJECTS[k], can = s.money >= p.cost;
                  return (
                    <button key={k} className="pcard" disabled={!can} onClick={() => choose(k)}>
                      <div className="pc-top"><b>{p.name}</b><span className="cost">£{p.cost}k</span></div>
                      <p>{p.line}</p>
                      <Chips fx={p.fx} />
                      {!can && <em className="cant">Can’t afford it yet</em>}
                    </button>
                  );
                })}
              </div>
              <button className="save" onClick={() => choose(null)}><PiggyBank size={18} /> Build nothing and save (+£6k interest)</button>
              {lockedProjects(s).length > 0 && <p className="locked-note">Still locked: {lockedProjects(s).map((k) => `${PROJECTS[k].name} (${PROJECTS[k].needsText.toLowerCase()})`).join(', ')}.</p>}
            </div>
          )}

          {phase === 'event' && event && (
            <div className="panel dilemma">
              <p className="kicker">Year {year} · A question from your citizens</p>
              {event.because && <p className="because">{event.because}…</p>}
              <h2>{event.text}</h2>
              <div className="choices">
                {['a', 'b'].map((c) => {
                  const after = s.money + (event[c].fx.money || 0);
                  return (
                    <button key={c} className="choice" onClick={() => decide(c)}>
                      <b>{event[c].label}</b>
                      <Chips fx={event[c].fx} />
                      {after < 0 && <em className="debt">This puts you £{-after}k in debt before taxes come in. Debt makes people grumpier every year until it’s paid off.</em>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === 'report' && report && (
            <div className="panel news">
              <div className="paper-head"><Newspaper size={18} /> THE DAILY ISLANDER · YEAR {s.turn - 1}</div>
              <h2>{report.out}</h2>
              <table className="ledger-t">
                <caption>The year’s money</caption>
                <tbody>
                  <tr><th scope="row">Start of the year</th><td>£{report.ledger.opening}k</td></tr>
                  {report.ledger.project !== 0 && <tr><th scope="row">Project</th><td className="down">−£{-report.ledger.project}k</td></tr>}
                  {report.ledger.interest !== 0 && <tr><th scope="row">Interest on savings</th><td className="up">+£{report.ledger.interest}k</td></tr>}
                  {report.ledger.event !== 0 && <tr><th scope="row">Your decision</th><td className={report.ledger.event > 0 ? 'up' : 'down'}>{report.ledger.event > 0 ? '+' : '−'}£{Math.abs(report.ledger.event)}k</td></tr>}
                  <tr><th scope="row">Taxes</th><td className="up">+£{report.ledger.tax}k</td></tr>
                  {report.ledger.income !== 0 && <tr><th scope="row">Factories, farms &amp; other income</th><td className={report.ledger.income > 0 ? 'up' : 'down'}>{report.ledger.income > 0 ? '+' : '−'}£{Math.abs(report.ledger.income)}k</td></tr>}
                  <tr className="total"><th scope="row">End of the year</th><td>£{report.ledger.closing}k</td></tr>
                </tbody>
              </table>
              <ul className="ledger">
                <li><span>Population change</span><b>{report.deltas.pop >= 0 ? '+' : ''}{report.deltas.pop}</b></li>
                {report.crowded && <li className="warn"><span>Out of homes! People are getting cramped.</span></li>}
                {!report.crowded && report.nearlyFull && <li className="warn"><span>Almost out of homes. Expect trouble next year unless you build some.</span></li>}
                {s.green < 35 && <li className="warn"><span>Smog is making people grumpy.</span></li>}
                {s.commute > 40 && <li className="warn"><span>Traffic is making people grumpy.</span></li>}
                {s.money < 0 && <li className="warn"><span>You’re in debt. Morale is suffering.</span></li>}
              </ul>
              <button className="big-b" onClick={next}>{s.done ? 'See what you built' : `On to year ${s.turn}`}</button>
            </div>
          )}

          {phase === 'end' && (
            <div className="panel ending">
              <div className="end-flag"><Flag f={flag} w={120} /></div>
              <p className="kicker">After ten years, the world knows you as…</p>
              <h2 className="end-title">{title(s)}</h2>
              <p className="motto">National motto: “{motto(s)}”</p>
              <div className="score"><span>National score</span><b>{score(s)}</b>{best && best.isBest && <em>New personal best!</em>}{best && !best.isBest && best.prev && <em>Your best: {best.prev}</em>}</div>
              <div className="chart-wrap"><Chart history={s.history} /><div className="legend"><i style={{ background: '#ff6b57' }} /> Happiness <i style={{ background: '#2fbf71' }} /> Nature</div>
                <p className="trend">{(() => { const a = s.history[0], z = s.history[s.history.length - 1]; const d = (k, l) => `${l} ${z[k] > a[k] ? 'rose' : z[k] < a[k] ? 'fell' : 'stayed'} ${z[k] === a[k] ? `at ${a[k]}` : `from ${a[k]} to ${z[k]}`}`; return `${d('happy', 'Happiness')}, ${d('green', 'nature')}, and the population went from ${a.pop.toLocaleString()} to ${z.pop.toLocaleString()}.`; })()}</p>
              </div>
              {best && best.last && <p className="vs-last">Last time, {best.last.name} scored {best.last.score}. {score(s) > best.last.score ? `This one beat it by ${score(s) - best.last.score}.` : score(s) < best.last.score ? `This one fell short by ${best.last.score - score(s)}.` : 'Exactly the same. Spooky.'}</p>}
              <h3>Why it turned out like this</h3>
              <ul className="why">{consequences(s).map((c, i) => <li key={i}>{c}</li>)}</ul>
              <h3>Your ten years</h3>
              <ol className="timeline">{s.events.map((e, i) => <li key={i}><b>Year {e.turn}:</b> {e.because ? <i>({e.because.toLowerCase()}) </i> : null}{(() => { const pl = s.plots.find((x) => x.turn === e.turn); return pl ? `Built ${PROJECTS[pl.key].name.toLowerCase()}. ` : 'Saved money. '; })()}{e.choice}. <span>{e.out}</span></li>)}</ol>
              <div className="end-actions">
                <button className="big-b" onClick={again}><RotateCcw size={18} /> Found another nation</button>
                <button className="ghost-b" onClick={share}><Copy size={16} /> {copied ? 'Copied!' : 'Copy result'}</button>
                <a className="ghost-b" href="/">Back to oddball</a>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
