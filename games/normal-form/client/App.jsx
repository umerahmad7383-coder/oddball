import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, X, RotateCcw, Copy, Stamp } from 'lucide-react';
import { buildRules, evaluateRules, revealedCount, emptyForm, makeVariant, HEARD, WEEKDAYS } from '../logic/rules.js';
import { GameSponsorNote } from '../../../platform/client/promo.jsx';
import { recordPlay } from '../../../platform/client/api.js';

const BEST_KEY = 'oddball.form.best';
const IDLE = ['Take your time. We close at five.', 'Please write clearly. Or don’t. Nobody reads these.', 'This form has been perfectly normal since 1974.', 'Gerald, Admin. Here to help, technically.'];
const fmtTime = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const beep = (f = 660, d = 0.08) => { try { const c = beep.c || (beep.c = new (window.AudioContext || window.webkitAudioContext)()); const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d); } catch (e) { /* no audio */ } };

function Field({ label, id, bad, children, hint }) {
  return (
    <div className={`fld ${bad ? 'bad' : ''}`}>
      <label htmlFor={id}>{label}{bad > 0 && <span className="fld-badge" aria-label={`${bad} problem${bad > 1 ? 's' : ''}`}>{bad}</span>}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

export default function App() {
  const [variant, setVariant] = useState(() => makeVariant());
  const rules = useMemo(() => buildRules(variant), [variant]);
  const [form, setForm] = useState(emptyForm);
  const [shown, setShown] = useState(1);
  const [startAt, setStartAt] = useState(Date.now());
  const [dodges, setDodges] = useState(0);
  const [btnPos, setBtnPos] = useState(null);
  const [done, setDone] = useState(null);
  const [breaks, setBreaks] = useState(0);
  const [clerk, setClerk] = useState(IDLE[0]);
  const [fresh, setFresh] = useState(null);
  const [copied, setCopied] = useState(false);
  const prevOk = useRef({});
  const results = useMemo(() => evaluateRules(rules, form), [rules, form]);
  const revealed = revealedCount(results, shown);
  const visible = results.slice(0, revealed);
  const allDone = revealed === results.length && results.every((r) => r.ok);

  // reveal the next rule once every visible rule passes, and react to newly broken rules
  useEffect(() => {
    if (revealed > shown) {
      const t = setTimeout(() => { setShown(revealed); setFresh(results[revealed - 1].id); setClerk(results[revealed - 2] ? results[revealed - 2].clerk : IDLE[1]); beep(880, 0.12); }, 450);
      return () => clearTimeout(t);
    }
    let broke = 0;
    visible.forEach((r) => { if (prevOk.current[r.id] && !r.ok) broke++; prevOk.current[r.id] = r.ok; });
    if (broke) { setBreaks((b) => b + broke); beep(220, 0.12); }
    return undefined;
  }, [results, revealed, shown]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const failing = (field) => visible.filter((r) => r.field === field && !r.ok).length;

  const dodge = () => {
    if (!allDone || dodges >= 3) return false;
    setDodges((d) => d + 1);
    setBtnPos({ left: `${10 + Math.random() * 60}%`, top: `${Math.random() * 60}%` });
    setClerk(['Oh, the button gets nervous sometimes.', 'Try again. It respects persistence.', 'Last time, I promise. Probably.'][dodges]);
    beep(1200, 0.05);
    return true;
  };
  const submit = (e) => {
    if (e) e.preventDefault();
    if (!allDone) { setClerk('The form isn’t finished. The requirements list is on the right.'); beep(200, 0.15); return; }
    if (dodge()) return;
    const ms = Date.now() - startAt;
    let best = null; try { best = Number(localStorage.getItem(BEST_KEY)) || null; } catch (err) { /* ignore */ }
    const isBest = !best || ms < best;
    if (isBest) { try { localStorage.setItem(BEST_KEY, String(ms)); } catch (err) { /* ignore */ } }
    setDone({ ms, best: isBest ? ms : best, isBest, ref: `NF-${Math.floor(100000 + Math.random() * 899999)}` });
    recordPlay('normal-form', { score: Math.round(ms / 1000), won: true, meta: { rulesBroken: breaks } });
    beep(523, 0.1); setTimeout(() => beep(784, 0.2), 120);
  };
  const restart = () => {
    setVariant(makeVariant()); setForm(emptyForm()); setShown(1); setDodges(0); setBtnPos(null); setDone(null); setBreaks(0);
    setClerk(IDLE[Math.floor(Math.random() * IDLE.length)]); setStartAt(Date.now()); prevOk.current = {};
  };
  const share = async () => {
    const txt = `I completed The Perfectly Normal Form on oddball in ${fmtTime(done.ms)} (${rules.length} rules, ${breaks} broken along the way). Reference ${done.ref}. ${window.location.origin}/normal-form/`;
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) { /* ignore */ }
  };
  const sorted = visible.map((r, i) => ({ ...r, n: i + 1 })).sort((a, b) => (a.ok === b.ok ? b.n - a.n : a.ok ? 1 : -1));

  return (
    <div className="nf">
      <header className="nf-bar">
        <a href="/" className="nf-back"><ArrowLeft size={18} /> oddball</a>
        <div className="nf-dept"><b>Department of Perfectly Normal Forms</b><span>Form NF-1 · General application for something</span></div>
        <button className="nf-restart" onClick={restart} aria-label="Start a new form"><RotateCcw size={16} /> New form</button>
      </header>

      <main className="nf-main">
        <form className="paper" onSubmit={submit} noValidate>
          {(() => { const f = visible.find((r) => !r.ok); return f ? <div className="mini-req" role="status"><X size={14} /> {f.text}</div> : allDone ? <div className="mini-req ok" role="status"><Check size={14} /> All requirements met. Submit!</div> : null; })()}
          <div className="paper-head">
            <span className="paper-no">Ref. pending</span>
            <h1>Application Form</h1>
            <p>Please complete all fields. It’s a perfectly normal form.</p>
          </div>
          <Field label="1. Full name" id="f-name" bad={failing('name')}><input id="f-name" value={form.name} onChange={set('name')} autoComplete="off" spellCheck={false} /></Field>
          <Field label="2. Date of birth" id="f-dob" bad={failing('dob')} hint={form.dob ? `That was a ${WEEKDAYS[new Date(`${form.dob}T12:00:00Z`).getUTCDay()] || '…'}.` : null}><input id="f-dob" type="date" value={form.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" /></Field>
          <Field label="3. Email address" id="f-email" bad={failing('email')}><input id="f-email" value={form.email} onChange={set('email')} autoComplete="off" spellCheck={false} inputMode="email" /></Field>
          <Field label="4. Favourite number" id="f-fav" bad={failing('fav')}><input id="f-fav" value={form.fav} onChange={set('fav')} inputMode="numeric" autoComplete="off" /></Field>
          <Field label="5. How did you hear about us?" id="f-heard" bad={failing('heard')}>
            <select id="f-heard" value={form.heard} onChange={set('heard')}>{HEARD.map((h) => <option key={h}>{h}</option>)}</select>
          </Field>
          <div className={`fld check ${failing('agree') ? 'bad' : ''}`}>
            <label><input type="checkbox" checked={form.agree} onChange={set('agree')} /> I agree to everything{failing('agree') > 0 && <span className="fld-badge">1</span>}</label>
          </div>
          <Field label="6. Signature" id="f-sign" bad={failing('sign')}><input id="f-sign" className="sig" value={form.sign} onChange={set('sign')} autoComplete="off" spellCheck={false} /></Field>
          <div className="submit-zone">
            <button type="submit" className={`submit ${allDone ? 'ready' : ''} ${dodges >= 3 ? 'tamed' : ''}`} style={btnPos && dodges < 3 ? { position: 'absolute', left: btnPos.left, top: btnPos.top } : null}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') dodge(); }}>
              <Stamp size={18} /> {dodges >= 3 ? 'Fine. Submit.' : 'Submit form'}
            </button>
          </div>
        </form>

        <aside className="clip">
          <div className="clerk"><div className="clerk-face" aria-hidden="true"><i /><i /><b /></div><p><b>Gerald, Admin:</b> {clerk}</p></div>
          <div className="board">
            <div className="board-clip" aria-hidden="true" />
            <h2>Requirements</h2>
            <p className="board-sub">{visible.filter((r) => r.ok).length} of {revealed} met{revealed < rules.length ? ' · more may follow' : ' · that’s all of them'}</p>
            <ol className="rules">
              {sorted.map((r) => (
                <li key={r.id} className={`rule ${r.ok ? 'ok' : 'no'} ${fresh === r.id ? 'fresh' : ''}`}>
                  <span className="rule-n">{r.n}</span>
                  <span className="rule-ico">{r.ok ? <Check size={16} /> : <X size={16} />}</span>
                  <span className="rule-t">{r.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </main>

      <GameSponsorNote game="normal-form" style={{ color: '#eef3ea', paddingBottom: 24 }} />
      {done && (
        <div className="done" role="dialog" aria-label="Form accepted">
          <div className="done-card">
            <div className="approved">APPROVED</div>
            <h2>Your form has been accepted.</h2>
            <p>It will now be filed in a cabinet and never looked at again.</p>
            <dl>
              <div><dt>Reference</dt><dd>{done.ref}</dd></div>
              <div><dt>Time</dt><dd>{fmtTime(done.ms)}{done.isBest ? ' · personal best!' : ''}</dd></div>
              <div><dt>Rules obeyed</dt><dd>{rules.length}</dd></div>
              <div><dt>Rules broken on the way</dt><dd>{breaks}</dd></div>
              {!done.isBest && done.best && <div><dt>Your best</dt><dd>{fmtTime(done.best)}</dd></div>}
            </dl>
            <div className="done-actions">
              <button className="btn-red" onClick={restart}><RotateCcw size={16} /> Fill in another form</button>
              <button className="btn-plain" onClick={share}><Copy size={16} /> {copied ? 'Copied!' : 'Copy my result'}</button>
              <a className="btn-plain" href="/">Back to oddball</a>
            </div>
            <small>Each new form changes a few rules.</small>
          </div>
        </div>
      )}
    </div>
  );
}
