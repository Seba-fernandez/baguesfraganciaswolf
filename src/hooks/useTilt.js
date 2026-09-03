import { useEffect, useRef } from 'react';

/**
 * Tilt magnético sutil: el card sigue levemente al mouse (rotateX/rotateY +
 * un brillo que se mueve con el puntero), solo en dispositivos con mouse
 * real. Nada de esto corre en touch (no hay hover) ni con
 * prefers-reduced-motion — en esos casos el elemento se queda con el hover
 * plano normal que ya define el CSS.
 */
export default function useTilt(maxDeg = 6) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduce) return;

    function onMove(e) {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top) / r.height;   // 0..1
      const rx = (0.5 - py) * maxDeg * 2;
      const ry = (px - 0.5) * maxDeg * 2;
      el.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
      el.style.setProperty('--glow-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--glow-y', `${(py * 100).toFixed(1)}%`);
    }
    function onLeave() {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    }

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [maxDeg]);

  return ref;
}
