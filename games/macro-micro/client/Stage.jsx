import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { STEPS, zoomAt, viewCentre } from '../shared/scoring.js';

/* The zoomable photo.
 * - `target` is the zoom step the player has asked for; the picture eases towards it every frame.
 * - Layout uses real pixel sizes (no CSS scale), so the browser always draws from the full-resolution layers.
 * - The detail layer is a full-resolution crop placed exactly over its region of the whole photo. */
export function Stage({ obj, fullSrc, detailSrc, target, onTarget, locked, onLoad, onError, children, maxH }) {
  const wrap = useRef(null), plane = useRef(null), shown = useRef(target), raf = useRef(0), tgt = useRef(target);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState({ full: false, detail: false });
  const zMax = obj.startZoom;
  tgt.current = target;

  // size the stage to the photo's own proportions, within the space available
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const fit = () => {
      const availW = el.parentElement.clientWidth;
      const availH = Math.max(220, maxH || window.innerHeight * 0.62);
      let w = availW, h = w / obj.aspect;
      if (h > availH) { h = availH; w = h * obj.aspect; }
      setBox({ w: Math.round(w), h: Math.round(h) });
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el.parentElement);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [obj.id, obj.aspect, maxH]);

  // draw one frame at step s
  const draw = (s) => {
    const el = plane.current; if (!el || !box.w) return;
    const z = zoomAt(s, zMax), c = viewCentre(z, obj.focus);
    const W = box.w * z, H = box.h * z;
    el.style.width = `${W}px`; el.style.height = `${H}px`;
    el.style.left = `${box.w / 2 - c.x * W}px`; el.style.top = `${box.h / 2 - c.y * H}px`;
  };
  // ease towards the target; stops itself when it arrives (no idle animation loop)
  const kick = () => {
    if (raf.current) return;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(64, now - last); last = now;
      const diff = tgt.current - shown.current;
      shown.current = Math.abs(diff) < 0.5 ? tgt.current : shown.current + diff * (1 - Math.exp(-dt / 70));
      draw(shown.current);
      raf.current = shown.current === tgt.current ? 0 : requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => { kick(); }, [target, box.w, box.h]);
  useEffect(() => { shown.current = target; draw(target); }, [obj.id, box.w]); // new photo: jump, don't animate
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // mouse wheel and pinch. Attached once per photo; never scrolls the page while over the photo.
  useEffect(() => {
    const el = wrap.current; if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (locked) return;
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      onTarget((s) => s - Math.max(-80, Math.min(80, px * 0.5)));
    };
    const pts = new Map(); let pinch = null;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const down = (e) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinch = { d: dist(), s: tgt.current }; };
    const move = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2 && !locked) {
        const ratio = dist() / Math.max(1, pinch.d);
        // work the value out now: the gesture object may be gone by the time React applies the update
        const next = pinch.s + (Math.log(ratio) / Math.log(zMax)) * STEPS;
        onTarget(next);
      }
    };
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('wheel', onWheel); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    };
  }, [obj.id, locked, zMax, onTarget]);

  const loaded = (k) => () => setReady((r) => { const n = { ...r, [k]: true }; if (n.detail && onLoad) onLoad(); return n; });
  const r = obj.region;
  return (
    <div className={`stage ${ready.detail ? 'ready' : 'loading'}`} ref={wrap} style={{ width: box.w || '100%', height: box.h || 300 }} aria-label="Zoomed photo. Use the slider or your mouse wheel to zoom out.">
      <div className="plane" ref={plane}>
        <img className="layer full" src={fullSrc} alt="" draggable="false" onLoad={loaded('full')} onError={onError} decoding="async" />
        <img className="layer detail" src={detailSrc} alt="" draggable="false" onLoad={loaded('detail')} onError={onError} decoding="async"
          style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, opacity: ready.full ? undefined : 1 }} />
      </div>
      {!ready.detail && <div className="developing">Developing photo…</div>}
      <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
      {children}
    </div>
  );
}
