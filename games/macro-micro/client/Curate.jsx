import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Search, Trash2, Play } from 'lucide-react';
import { api } from '../../../platform/client/api.js';
import { viewCentre, DETAIL_PIVOT } from '../shared/scoring.js';

const FREE = /^(cc0|pd|cc-by(-sa)?-\d)/i;
const DIFF = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const strip = (h) => String(h || '').replace(/<[^>]*>/g, '').trim();

async function commonsSearch(base, query) {
  const qs = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '24', prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '360' });
  const r = await fetch(`${base}?${qs}`);
  if (!r.ok) throw new Error(`Commons search failed (${r.status}).`);
  const j = await r.json();
  return Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).map((p) => {
    const ii = (p.imageinfo || [])[0] || {}, m = ii.extmetadata || {};
    const code = String((m.License && m.License.value) || '').toLowerCase(), short = strip(m.LicenseShortName && m.LicenseShortName.value);
    return { title: p.title, thumb: ii.thumburl, w: ii.width, h: ii.height, license: short || code, free: FREE.test(code) || /public domain/i.test(short), big: Math.min(ii.width || 0, ii.height || 0) >= 1500, author: strip(m.Artist && m.Artist.value) };
  });
}
async function commonsPreview(base, title) {
  const qs = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: title, prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '1600' });
  const j = await (await fetch(`${base}?${qs}`)).json();
  const ii = Object.values(j.query.pages)[0].imageinfo[0];
  return { url: ii.thumburl || ii.url, w: ii.width, h: ii.height };
}

/* What the player will see first: a CSS crop of the preview at the chosen zoom and focus. */
function StartView({ src, aspect, focus, zoom }) {
  const c = viewCentre(zoom, focus);
  const pos = (v) => (zoom === 1 ? 50 : ((v * zoom - 0.5) / (zoom - 1)) * 100);
  return <div className="startview" style={{ aspectRatio: aspect, backgroundImage: `url(${src})`, backgroundSize: `${zoom * 100}% ${zoom * 100}%`, backgroundPosition: `${pos(c.x)}% ${pos(c.y)}%` }} aria-label="Starting view" />;
}

function Picker({ o, base, onDone }) {
  const [query, setQuery] = useState(o.search), [results, setResults] = useState(null), [err, setErr] = useState(''), [pick, setPick] = useState(null), [preview, setPreview] = useState(null);
  const [focus, setFocus] = useState(o.curation ? { x: o.curation.focus_x, y: o.curation.focus_y } : { x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(o.curation ? o.curation.start_zoom : o.defaultZoom);
  const [busy, setBusy] = useState(false), [done, setDone] = useState(null), [manual, setManual] = useState('');
  const search = async (e) => { if (e) e.preventDefault(); setErr(''); setResults(null); try { setResults(await commonsSearch(base, query)); } catch (x) { setErr(x.message); } };
  useEffect(() => { search(); }, [o.id]);
  useEffect(() => { if (o.curation) choose({ title: o.curation.file_title, free: true, big: true }); }, [o.id]);
  const choose = async (r) => { setPick(r); setPreview(null); setDone(null); try { setPreview(await commonsPreview(base, r.title)); } catch (x) { setErr('Couldn’t load a preview of that photo.'); } };
  const approve = async () => {
    setBusy(true); setErr(''); setDone(null);
    try { const j = await api(`/api/macro/admin/${o.id}`, { method: 'POST', body: { file: pick.title, focus, startZoom: zoom } }); setDone(j); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const remove = async () => { if (!window.confirm(`Remove the photo for ${o.name}? It will leave the game.`)) return; await api(`/api/macro/admin/${o.id}/remove`, { method: 'POST' }); onDone(); };
  const click = (e) => { const r = e.currentTarget.getBoundingClientRect(); setFocus({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }); };
  return (
    <div className="picker">
      <div className="pk-head">
        <div><h2>{o.name}</h2><p>{DIFF[o.difficulty]} · answers: {o.answers.slice(0, 4).join(', ')}</p></div>
        {o.curation && <div className="pk-cur"><button className="btn-line" onClick={() => window.open(`/macro-micro/?try=${o.pid}`, '_blank')}><Play size={14} /> Test it</button><button className="btn-quiet" onClick={remove}><Trash2 size={14} /> Remove</button></div>}
      </div>
      <form className="pk-search" onSubmit={search}><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search Wikimedia Commons" /><button className="btn-main"><Search size={15} /> Search Commons</button></form>
      <form className="pk-search" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) choose({ title: manual.trim().startsWith('File:') ? manual.trim() : `File:${manual.trim()}`, free: true, big: true }); }}><input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="…or paste an exact file name, e.g. File:Honeycomb.jpg" aria-label="Exact Commons file name" /><button className="btn-line">Use this file</button></form>
      {err && <p className="mm-note bad">{err}</p>}
      {!results && !err && <p className="mm-note">Searching Wikimedia Commons…</p>}
      {results && results.length === 0 && <p className="mm-note">Nothing found. Try simpler words.</p>}
      {results && <div className="pk-grid">{results.map((r) => (
        <button key={r.title} className={`pk-item ${pick && pick.title === r.title ? 'on' : ''}`} disabled={!r.free || !r.big} onClick={() => choose(r)} title={r.title}>
          {r.thumb && <img src={r.thumb} alt="" loading="lazy" />}
          <span>{r.w}×{r.h} · {r.license}{!r.free ? ' · not free' : !r.big ? ' · too small' : ''}</span>
        </button>
      ))}</div>}
      {pick && (
        <div className="pk-edit">
          <div>
            <h3>1. Click the spot the zoom should start on</h3>
            {preview ? (
              <div className="pk-photo" onClick={click} style={{ aspectRatio: preview.w / preview.h }}>
                <img src={preview.url} alt={pick.title} draggable="false" />
                <i className="pk-dot" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }} />
                <i className="pk-box" style={{ left: `${(viewCentre(zoom, focus).x - 0.5 / zoom) * 100}%`, top: `${(viewCentre(zoom, focus).y - 0.5 / zoom) * 100}%`, width: `${100 / zoom}%`, height: `${100 / zoom}%` }} />
              </div>
            ) : <p className="mm-note">Loading preview…</p>}
            <p className="pk-small">{pick.title}</p>
          </div>
          <div>
            <h3>2. How zoomed in to start</h3>
            {preview && <StartView src={preview.url} aspect={preview.w / preview.h} focus={focus} zoom={zoom} />}
            <label className="pk-zoom">{zoom.toFixed(1)}× <input type="range" min="1.5" max="10" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
            <p className="pk-small">Hard to recognise, but not just a blur. The server checks the photo’s resolution and caps the zoom where it would start looking soft. Detail from {DETAIL_PIVOT}× up comes from the full-resolution original.</p>
            <button className="btn-main" disabled={busy || !preview} onClick={approve}>{busy ? 'Downloading and processing…' : <><Check size={16} /> Use this photo</>}</button>
            {done && <p className="mm-note good">Saved. Licence: {done.license}, by {done.author}. Stays sharp up to {done.sharpUntil}×{done.startZoom < zoom ? `, so the start zoom was capped at ${done.startZoom}×` : ''}.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function Curate() {
  const [me, setMe] = useState(undefined), [data, setData] = useState(null), [err, setErr] = useState(''), [sel, setSel] = useState(null);
  const load = () => api('/api/macro/admin').then(setData).catch((e) => setErr(e.message));
  useEffect(() => { api('/api/me').then((m) => { setMe(m.user ? m : null); if (m.user && m.user.role === 'admin') load(); }).catch(() => setMe(null)); }, []);
  if (me === undefined) return <div className="mm curate"><p className="mm-note">Loading…</p></div>;
  if (!me || me.user.role !== 'admin') return <div className="mm curate"><header className="mm-bar"><a className="mm-back" href="/macro-micro/"><ArrowLeft size={17} /> Macro / Micro</a></header><main className="menu"><h1 className="cur-h">Photo picker</h1><p className="mm-note">Admins only. <a href="/login?next=/macro-micro/curate">Sign in</a> with an admin account.</p></main></div>;
  const done = data ? data.objects.filter((o) => o.curation).length : 0;
  return (
    <div className="mm curate">
      <header className="mm-bar"><a className="mm-back" href="/macro-micro/"><ArrowLeft size={17} /> Macro / Micro</a><span className="mm-round">{data ? `${done} of ${data.objects.length} photos chosen` : ''}</span></header>
      <main className="cur-main">
        {err && <p className="mm-note bad">{err}</p>}
        {data && (
          <div className="cur-layout">
            <nav className="cur-list" aria-label="Objects">
              {Object.entries(data.categories).map(([k, label]) => (
                <section key={k}><h3>{label}</h3>
                  {data.objects.filter((o) => o.category === k).map((o) => (
                    <button key={o.id} className={`cur-row ${sel === o.id ? 'on' : ''} ${o.curation ? 'has' : ''}`} onClick={() => setSel(o.id)}>
                      {o.curation ? <img src={`/api/macro/img/${o.pid}/thumb?v=${new Date(o.curation.updated_at).getTime()}`} alt="" /> : <i />}
                      <span>{o.name}</span><small>{DIFF[o.difficulty]}</small>
                    </button>
                  ))}
                </section>
              ))}
            </nav>
            <div className="cur-panel">{sel ? <Picker key={sel} o={data.objects.find((o) => o.id === sel)} base={data.commonsApi} onDone={load} /> : <div className="mm-note"><p><b>Choose an object on the left.</b></p><p>For each one, pick a sharp, freely licensed photo where the object is clearly recognisable when fully zoomed out, then click an interesting spot to start the zoom on. Only CC0, public domain, CC BY and CC BY-SA photos are accepted, and every photo is credited in the game.</p></div>}</div>
          </div>
        )}
      </main>
    </div>
  );
}

export function Credits() {
  const [c, setC] = useState(null);
  useEffect(() => { api('/api/macro/credits').then((j) => setC(j.credits)).catch(() => setC([])); }, []);
  return (
    <div className="mm">
      <header className="mm-bar"><a className="mm-back" href="/macro-micro/"><ArrowLeft size={17} /> Macro / Micro</a></header>
      <main className="menu credits">
        <h1 className="cur-h">Photo credits</h1>
        <p className="mm-note">Spoilers: this page names every object. All photos come from Wikimedia Commons under free licences.</p>
        {!c ? <p className="mm-note">Loading…</p> : c.length === 0 ? <p className="mm-note">No photos yet.</p> : (
          <ul>{c.map((x) => <li key={x.file}><b>{x.name}</b>: {x.author}, {x.licenseUrl ? <a href={x.licenseUrl} target="_blank" rel="noreferrer">{x.license}</a> : x.license}{x.sourceUrl && <>, <a href={x.sourceUrl} target="_blank" rel="noreferrer">source</a></>}</li>)}</ul>
        )}
      </main>
    </div>
  );
}
