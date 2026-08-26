import { useEffect } from 'react';

/**
 * Native scroll only — Lenis + GSAP ticker fights the WebGL loop and hitch
 * every route change. Pond / hub already feel smooth without it.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('lenis', 'lenis-smooth');
  }, []);

  return children;
}
