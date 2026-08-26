import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fade / slide-up reveal on scroll.
 * @param {object} options
 * @param {number} [options.y=48]
 * @param {number} [options.duration=1]
 * @param {string} [options.start='top 85%']
 * @param {boolean} [options.enabled=true]
 */
export function useGsapReveal(options = {}) {
  const ref = useRef(null);
  const {
    y = 48,
    duration = 1,
    start = 'top 85%',
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled || !ref.current || prefersReducedMotion()) return undefined;

    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [y, duration, start, enabled]);

  return ref;
}

/**
 * Stagger children (e.g. table rows) on scroll enter.
 */
export function useGsapStagger(deps = [], options = {}) {
  const containerRef = useRef(null);
  const {
    childSelector = '[data-reveal-row]',
    y = 24,
    stagger = 0.08,
    start = 'top 80%',
  } = options;

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return undefined;

    const el = containerRef.current;
    const children = el.querySelectorAll(childSelector);
    if (!children.length) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
