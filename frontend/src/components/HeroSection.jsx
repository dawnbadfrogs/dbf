import { useEffect, useMemo, useRef, useCallback } from 'react';
import gsap from 'gsap';

const HIGHLIGHT_KEYS = new Set([
  'DAWN',
  'BAD',
  'FROGS.',
  '$DBF',
  'REKT TO EARN,',
  'LEADERBOARDS',
  'TREASURY',
]);

const LINES = [
  ['STEP', 'INTO', 'DAWN', 'BAD', 'FROGS.'],
  ['WE', 'TURN', 'YOUR', 'WORST'],
  ['TRADES', 'INTO', '$DBF'],
  ['THROUGH', 'REKT TO EARN,', 'LOSS', '&'],
  ['LEADERBOARDS', '&', 'TREASURY', 'REWARDS'],
];

/**
 * Hero typography + CTA. Galaxy canvas lives on LandingPage (persistent).
 */
const HeroSection = ({ phase = 'hero', onGetStarted }) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const typeRef = useRef(null);
  const ctaRef = useRef(null);

  const flatWords = useMemo(() => LINES.flat(), []);
  const isDiving = phase === 'diving';

  useEffect(() => {
    const el = typeRef.current;
    if (!el) return undefined;

    const fit = () => {
      const parent = el.parentElement;
      const stage = contentRef.current;
      if (!parent) return;
      const targetW = parent.clientWidth * 0.94;
      const maxH = Math.max((stage?.clientHeight || window.innerHeight) - 220, 160);
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize) || 48;
      const naturalW = el.scrollWidth;
      const naturalH = el.scrollHeight;
      if (naturalW <= 0) return;
      const byWidth = (targetW / naturalW) * base;
      const byHeight = naturalH > 0 ? (maxH / naturalH) * base : byWidth;
      const next = Math.round(Math.min(Math.max(Math.min(byWidth, byHeight), 18), 72));
      el.style.fontSize = `${next}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement || el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  // Fade hero copy when diving — opacity/y only (no blur)
  useEffect(() => {
    if (!isDiving || !contentRef.current) return undefined;
    const tween = gsap.to(contentRef.current, {
      opacity: 0,
      duration: 0.28,
      ease: 'power2.out',
    });
    return () => tween.kill();
  }, [isDiving]);

  const handleGetStarted = useCallback(() => {
    if (isDiving) return;
    onGetStarted?.();
  }, [isDiving, onGetStarted]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-section relative z-[5] min-h-[100svh] flex flex-col overflow-x-hidden"
    >
      <div
        ref={contentRef}
        className="hero-stage relative z-[5] flex min-h-[100svh] flex-1 flex-col"
      >
        <div className="relative z-[5] flex min-h-[100svh] flex-1 flex-col px-4 md:px-8 pt-24">
          <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 items-center">
            <h1
              ref={typeRef}
              className="hero-type select-none font-black uppercase leading-[0.95] tracking-[-0.02em]"
            >
              {LINES.map((line, lineIdx) => (
                <span
                  key={lineIdx}
                  className="hero-type-line block whitespace-nowrap"
                >
                  {line.map((word, wi) => {
                    const highlight = HIGHLIGHT_KEYS.has(word);
                    return (
                      <span
                        key={`${lineIdx}-${wi}`}
                        data-word
                        className={`hero-word mb-[0.12em] mr-[0.22em] inline-block align-middle ${
                          highlight ? 'hero-pill' : ''
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </span>
              ))}
            </h1>
          </div>

          <div
            ref={ctaRef}
            className="hero-cta-wrap relative z-[6] flex shrink-0 flex-col items-center justify-end pb-10 pt-6 md:pb-14"
          >
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={isDiving}
              className="hero-cta group inline-flex cursor-pointer items-center gap-0 disabled:cursor-wait disabled:opacity-70"
            >
              <span className="cta-main rounded-2xl bg-pond-green px-7 py-3 text-sm font-bold uppercase tracking-wider text-cartoon-ink">
                Get Started
              </span>
              <span className="cta-arrow ml-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-cartoon-yellow text-cartoon-ink text-lg font-black">
                →
              </span>
            </button>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-cartoon-cream/70">
              Dive in to play
            </p>
          </div>
        </div>
      </div>

      <p className="sr-only">
        {flatWords.join(' ')}. Rekt to Earn on Solana.
      </p>
    </section>
  );
};

export default HeroSection;
