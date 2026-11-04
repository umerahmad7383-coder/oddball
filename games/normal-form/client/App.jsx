import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, X, RotateCcw, Copy, Stamp, ChevronDown } from 'lucide-react';
import { buildRules, evaluateRules, revealedCount, emptyForm, makeVariant, HEARD, WEEKDAYS, ACTS, parseDob } from '../logic/rules.js';
import { GameSponsorNote } from '../../../platform/client/promo.jsx';
import { recordPlay } from '../../../platform/client/api.js';

const BEST_KEY = 'oddball.form.best';          // unchanged from earlier versions
const DRAFT_KEY = 'oddball.form.draft.v2';       // in-progress form, so a refresh never loses work
const IDLE = ['Take your time. We close at five.', 'This form has been perfectly normal since 1974.', 'Gerald, Admin. Here to help, technically.'];
const fmtTime = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: play on without saving */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const beep = (f = 660, d = 0.08) => { try { const c = beep.c || (beep.c = new (window.AudioContext || window.webkitAudioContext)()); const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d); } catch (e) { /* no audio */ } };
const validDraft = (d) => d && d.variant && d.variant.v === 2 && d.form && typeof d.shown === 'number';

function Field({ label, id, bad, children, hint }) {
  return (
    <div className={`fld ${bad ? 'bad' : ''}`}>
      <label htmlFor={id}>{label}{bad > 0 && <span className="fld-badge" aria-label={`${bad} problem${bad > 1 ? 's' : ''}`}>{bad}</span>}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

/* The finished-form certificate. Focus moves onto the certificate itself (not a button, so a stray
 * extra Enter can't throw it away), and Tab stays inside it. */
function Certificate({ done, rules, breaks, onAgain, onShare, copied }) {
  const box = useRef(null);
  useEffect(() => {
    if (box.current) box.current.focus();
    const trap = (e) => {
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll('button, a')];
      const i = items.indexOf(document.activeElement);
      if (i < 0) { e.preventDefault(); (e.shiftKey ? items[items.length - 1] : items[0]).focus(); return; }
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, []);
  return (
    <div className="done" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <div className="done-card" ref={box} tabIndex={-1}>
        <div className="approved" aria-hidden="true">APPROVED</div>
        <h2 id="done-title">Your form has been accepted.</h2>
        <p>It will now be filed in a cabinet and never looked at again.</p>
        <dl>
          <div><dt>Reference</dt><dd>{done.ref}</dd></div>
          <div><dt>Time</dt><dd>{fmtTime(done.ms)}{done.isBest ? ' · personal best!' : ''}</dd></div>
          <div><dt>Rules obeyed</dt><dd>{rules.length}</dd></div>
          <div><dt>Rules broken on the way</dt><dd>{breaks}</dd></div>
          {!done.isBest && done.best && <div><dt>Your best</dt><dd>{fmtTime(done.best)}</dd></div>}
        </dl>
        <div className="done-actions">
          <button className="btn-red" onClick={onAgain}><RotateCcw size={16} /> Fill in another form</button>
          <button className="btn-plain" onClick={onShare}><Copy size={16} /> {copied ? 'Copied!' : 'Copy my result'}</button>
          <a className="btn-plain" href="/">Back to oddball</a>
        </div>
        <small>Every new form changes the weekday, the banned letter and how long your name has to be.</small>
      </div>
    </div>
  );
}

export default function App() {
  const saved = useMemo(() => { const d = store.get(DRAFT_KEY); return validDraft(d) ? d : null; }, []);
  const [resumeOffer, setResumeOffer] = useState(!!saved);
  const [variant, setVariant] = useState(() => (saved ? saved.variant : makeVariant()));
  const rules = useMemo(() => buildRules(variant), [variant]);
  const [form, setForm] = useState(() => (saved ? { ...emptyForm(), ...saved.form } : emptyForm()));
  const [shown, setShown] = useState(saved ? saved.shown : 1);
  const [breaks, setBreaks] = useState(saved ? saved.breaks || 0 : 0);
  const [elapsed, setElapsed] = useState(saved ? saved.elapsed || 0 : 0); // active time only
  const [dodged, setDodged] = useState(false);
  const [done, setDone] = useState(null);
  const [clerk, setClerk] = useState(saved ? 'Welcome back. Your form was exactly where you left it.' : IDLE[0]);
  const [fresh, setFresh] = useState(null);
  const [showMet, setShowMet] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevOk = useRef({});
  const finished = useRef(false); // guards against recording one completion twice
  const results = useMemo(() => evaluateRules(rules, form), [rules, form]);
  const revealed = revealedCount(results, shown);
  const visible = results.slice(0, revealed);
  const allDone = revealed === results.length && results.every((r) => r.ok);
  const act = visible.length ? visible[visible.length - 1].act : 1;

  // count only time spent with the page open
  useEffect(() => {
    if (done || resumeOffer) return undefined;
    let last = Date.now();
    const id = setInterval(() => { const n = Date.now(); if (!document.hidden) setElapsed((e) => e + (n - last)); last = n; }, 1000);
    return () => clearInterval(id);
  }, [done, resumeOffer]);
  // save the draft whenever something changes
  useEffect(() => {
    if (done || resumeOffer) return;
    store.set(DRAFT_KEY, { variant, form, shown, breaks, elapsed, savedAt: Date.now() });
  }, [variant, form, shown, breaks, elapsed, done, resumeOffer]);
  // reveal the next rule once every visible rule passes, and react to newly broken rules
  useEffect(() => {
    if (revealed > shown) {
      const t = setTimeout(() => {
        const next = results[revealed - 1];
        setShown(revealed); setFresh(next.id); beep(880, 0.12);
        const prevAct = results[revealed - 2] ? results[revealed - 2].act : 1;
        setClerk(next.act !== prevAct ? ACTS[next.act - 1].clerk : (results[revealed - 2] ? results[revealed - 2].clerk : IDLE[1]));
      }, 450);
      return () => clearTimeout(t);
    }
    let broke = 0;
    visible.forEach((r) => { if (prevOk.current[r.id] && !r.ok) broke++; prevOk.current[r.id] = r.ok; });
    if (broke) { setBreaks((b) => b + broke); beep(220, 0.12); setClerk('Ah. That broke something you’d already sorted.'); }
    return undefined;
  }, [results, revealed, shown]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const failing = (field) => visible.filter((r) => r.field === field && !r.ok).length;

  // one small joke for mouse users only: the button flinches once, then behaves
  const flinch = (e) => {
    if (e.pointerType !== 'mouse' || dodged || !allDone || reduced()) return;
    setDodged(true); setClerk('The button gets nervous sometimes. Try again.'); beep(1200, 0.05);
  };
  const submit = (e) => {
    if (e) e.preventDefault();
    if (finished.current) return;
    if (!allDone) { setClerk('The form isn’t finished. Check the requirements.'); beep(200, 0.15); return; }
    finished.current = true;
    const ms = elapsed;
    const best = Number(store.get(BEST_KEY)) || null;
    const isBest = !best || ms < best;
    if (isBest) store.set(BEST_KEY, ms);
    store.del(DRAFT_KEY);
    setDone({ ms, best: isBest ? ms : best, isBest, ref: `NF-${Math.floor(100000 + Math.random() * 899999)}` });
    recordPlay('normal-form', { score: Math.round(ms / 1000), won: true, meta: { rulesBroken: breaks, variant } });
    beep(523, 0.1); setTimeout(() => beep(784, 0.2), 120);
  };
  const restart = (ask) => {
    if (ask && !done && shown > 2 && !window.confirm('Start a new form? This one will be thrown away.')) return;
    store.del(DRAFT_KEY);
    setVariant(makeVariant()); setForm(emptyForm()); setShown(1); setDodged(false); setDone(null); setBreaks(0); setElapsed(0);
    setClerk(IDLE[Math.floor(Math.random() * IDLE.length)]); setResumeOffer(false); setShowMet(false);
    prevOk.current = {}; finished.current = false;
    window.scrollTo({ top: 0 });
  };
  const share = async () => {
    const txt = `I got The Perfectly Normal Form approved on oddball in ${fmtTime(done.ms)} (${rules.length} rules, ${breaks} broken along the way). Reference ${done.ref}. ${window.location.origin}/normal-form/`;
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) { /* ignore */ }
  };

  const unmet = visible.map((r, i) => ({ ...r, n: i + 1 })).filter((r) => !r.ok);
  const met = visible.map((r, i) => ({ ...r, n: i + 1 })).filter((r) => r.ok);
  const dob = parseDob(form.dob);
  const ruleItem = (r) => (
    <li key={r.id} className={`rule ${r.ok ? 'ok' : 'no'} ${fresh === r.id ? 'fresh' : ''}`}>
      <span className="rule-n">{r.n}</span>
      <span className="rule-ico" aria-hidden="true">{r.ok ? <Check size={16} /> : <X size={16} />}</span>
      <span className="rule-t"><span className="sr-only">{r.ok ? 'Done: ' : 'Not yet: '}</span>{r.text}</span>
    </li>
  );

  return (
    <div className="nf">
      <header className="nf-bar">
        <a href="/" className="nf-back"><ArrowLeft size={18} /> oddball</a>
        <div className="nf-dept"><b>Department of Perfectly Normal Forms</b><span>Form NF-1 · General application for something</span></div>
        <button className="nf-restart" onClick={() => restart(true)}><RotateCcw size={16} /> New form</button>
      </header>

      {resumeOffer && (
        <div className="resume" role="region" aria-label="Unfinished form">
          <p><b>You have an unfinished form.</b> {saved.shown} of {rules.length} requirements revealed, {fmtTime(saved.elapsed || 0)} spent.</p>
          <div><button className="btn-red" onClick={() => setResumeOffer(false)}>Carry on</button><button className="btn-plain" onClick={() => restart(false)}>Start a new one</button></div>
        </div>
      )}

      <main className="nf-main" aria-hidden={resumeOffer || !!done}>
        <form className="paper" onSubmit={submit} noValidate>
          {(() => { const f = unmet[0]; return f ? <div className="mini-req" role="status"><X size={14} /> {f.text}</div> : allDone ? <div className="mini-req ok" role="status"><Check size={14} /> Everything agrees. Submit!</div> : null; })()}
          <div className="paper-head">
            <span className="paper-no">Ref. pending</span>
            <h1>Application Form</h1>
            <p>Please complete all fields. Use made-up details: this is a puzzle, not a real form.</p>
          </div>
          <Field label="1. Full name" id="f-name" bad={failing('name')}><input id="f-name" value={form.name} onChange={set('name')} autoComplete="off" spellCheck={false} /></Field>
          <Field label="2. Date of birth" id="f-dob" bad={failing('dob')} hint={dob ? `A ${WEEKDAYS[dob.getUTCDay()]}.` : null}><input id="f-dob" type="date" value={form.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" /></Field>
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
            <button type="submit" className={`submit ${allDone ? 'ready' : ''} ${dodged ? 'flinched' : ''}`} onPointerEnter={flinch} aria-disabled={!allDone}>
              <Stamp size={18} /> Submit form
            </button>
            {!allDone && <small className="submit-note">{rules.length - met.length} requirement{rules.length - met.length === 1 ? '' : 's'} to go, maybe more.</small>}
          </div>
        </form>

        <aside className="clip">
          <div className="clerk"><div className="clerk-face" aria-hidden="true"><i /><i /><b /></div><p aria-live="polite"><b>Gerald, Admin:</b> {clerk}</p></div>
          <div className="board">
            <div className="board-clip" aria-hidden="true" />
            <h2>Requirements</h2>
            <ol className="acts" aria-label="Progress">{ACTS.map((a) => <li key={a.n} className={a.n < act || (a.n === act && allDone) ? 'past' : a.n === act ? 'now' : ''}>Part {a.n}: {a.name}</li>)}</ol>
            <ol className="rules" aria-live="polite">{unmet.map(ruleItem)}</ol>
            {met.length > 0 && (
              <div className="met">
                <button className="met-toggle" onClick={() => setShowMet(!showMet)} aria-expanded={showMet}><Check size={15} /> {met.length} met <ChevronDown size={15} className={showMet ? 'up' : ''} /></button>
                {showMet && <ol className="rules">{met.slice().reverse().map(ruleItem)}</ol>}
              </div>
            )}
          </div>
        </aside>
      </main>
      <GameSponsorNote game="normal-form" style={{ color: '#eef3ea', paddingBottom: 24 }} />
      {done && <Certificate done={done} rules={rules} breaks={breaks} onAgain={() => restart(false)} onShare={share} copied={copied} />}
    </div>
  );
}
