import { useEffect, useRef } from 'react';

/**
 * Shared smoothed pointer (-1…1). Drives pond + hub.
 * RAF only runs while catching up to the cursor — not a permanent 60fps CSS loop.
 */
export function usePointerParallax(enabled = true) {
  const mouseRef = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  useEffect(() => {
    if (!enabled) return undefined;

    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const tick = () => {
      const m = mouseRef.current;
      m.sx += (m.x - m.sx) * 0.14;
      m.sy += (m.y - m.sy) * 0.14;
      const caughtUp = Math.abs(m.x - m.sx) < 0.002 && Math.abs(m.y - m.sy) < 0.002;
      if (Math.abs(m.sx - lastX) >= 0.002 || Math.abs(m.sy - lastY) >= 0.002) {
        lastX = m.sx;
        lastY = m.sy;
        document.documentElement.style.setProperty('--mouse-x', m.sx.toFixed(3));
        document.documentElement.style.setProperty('--mouse-y', m.sy.toFixed(3));
      }
      raf = caughtUp ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.setProperty('--mouse-x', '0');
      document.documentElement.style.setProperty('--mouse-y', '0');
    };
  }, [enabled]);

  return mouseRef;
}
