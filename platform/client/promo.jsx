/* Promotion slots. Live visitors only ever get ACTIVE campaigns (and nothing while the global switch is off).
 * ?promo=preview (admins only) shows draft-for-preview / approved / active items without counting anything.
 * ?promo=off shows the site with no promotions at all, for before/after comparisons. */
import React, { useEffect, useRef, useState } from 'react';
import { previewMode } from './api.js';

export function usePromo(route) {
  const [state, setState] = useState({ items: [], preview: false, loaded: false });
  useEffect(() => {
    const mode = previewMode();
    if (mode === 'off') { setState({ items: [], preview: false, loaded: true }); return; }
    const sp = new URLSearchParams(window.location.search);
    const qs = new URLSearchParams({ route });
    if (mode === 'preview') { qs.set('preview', '1'); if (sp.get('show') != null) qs.set('show', sp.get('show')); if (sp.get('samples') != null) qs.set('samples', sp.get('samples')); }
    let alive = true;
    fetch(`/api/promo?${qs}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { items: [] })).then((j) => { if (alive) setState({ items: j.items || [], preview: !!j.preview, loaded: true }); }).catch(() => alive && setState({ items: [], preview: false, loaded: true }));
    return () => { alive = false; };
  }, [route]);
  return state;
}
/* Count an impression once, only when at least half the slot is on screen, and never in preview. */
export function useImpression(item, preview) {
  const ref = useRef(null);
  useEffect(() => {
    if (!item || preview || !ref.current || !('IntersectionObserver' in window)) return undefined;
    let done = false;
    const io = new IntersectionObserver((es) => {
      if (done || !es.some((e) => e.isIntersecting)) return;
      done = true; io.disconnect();
      fetch('/api/promo/seen', { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json', 'x-oddball': '1' }, body: JSON.stringify({ ids: [item.id] }) }).catch(() => {});
    }, { threshold: 0.5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [item && item.id, preview]);
  return ref;
}
export const deviceClass = (it) => `${it.desktop === false ? 'ob-no-desktop' : ''} ${it.mobile === false ? 'ob-no-mobile' : ''}`;
export const linkProps = (it) => ({ href: it.href || undefined, target: '_blank', rel: 'sponsored noopener noreferrer' });

export function FooterAd({ item, preview }) {
  const ref = useImpression(item, preview);
  const [broken, setBroken] = useState(false);
  if (!item) return null;
  return (
    <aside className={`ob-ad ${deviceClass(item)}`} ref={ref} aria-label="Advertisement" style={{ maxWidth: item.width ? item.width + 20 : 488 }}>
      <span className="ob-ad-label">{item.label || 'Advertisement'}</span>
      <a {...linkProps(item)} className="ob-ad-body">
        {item.image && !broken && <img src={item.image} alt="" width={item.height ? Math.round(item.height * 1.6) : 96} height={item.height || 60} onError={() => setBroken(true)} />}
        <span><b>{item.title}</b>{item.body && <small>{item.body}</small>}</span>
      </a>
    </aside>
  );
}
export function SponsorLine({ item, preview }) {
  const ref = useImpression(item, preview);
  if (!item) return null;
  return <p className={`ob-sponsor ${deviceClass(item)}`} ref={ref}>oddball is supported by <a {...linkProps(item)}>{item.title}</a> <span className="ob-tag">{item.label || 'Sponsor'}</span></p>;
}

/* Small "supported by" line for a game's start screen. Self-styled so it fits any game. */
const NOTE_CSS = `.ob-gnote{margin:14px auto 0;font:13px/1.4 system-ui,sans-serif;opacity:.75;text-align:center}.ob-gnote a{color:inherit;font-weight:700;text-decoration:underline}.ob-gnote .ob-tag{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid currentColor;border-radius:4px;font-size:11px;opacity:.8}@media (max-width:640px){.ob-no-mobile{display:none!important}}@media (min-width:641px){.ob-no-desktop{display:none!important}}`;
export function GameSponsorNote({ game, style }) {
  const { items, preview } = usePromo(`game:${game}`);
  const item = items[0];
  const ref = useImpression(item, preview);
  if (!item) return null;
  return (
    <p className={`ob-gnote ${deviceClass(item)}`} ref={ref} style={style}>
      <style>{NOTE_CSS}</style>
      This experiment is supported by {item.href ? <a {...linkProps(item)}>{item.title}</a> : <b>{item.title}</b>}<span className="ob-tag">{item.label || 'Sponsored'}</span>
    </p>
  );
}
