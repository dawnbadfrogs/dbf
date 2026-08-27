import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ASSETS = ['/frog.glb'];
const TITLE_LINES = ['DAWN BAD', 'FROGS'];
const TITLE = TITLE_LINES.join('\n');
/** Half the previous 110ms cadence */
const CHAR_MS = 55;
/** Smooth 0→100 fill, independent of asset jumps */
const PROGRESS_MS = 2600;
const FAILSAFE_MS = 5000;

function loadAssets() {
  return Promise.all(
    ASSETS.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      await res.blob();
    })
  );
}

export default function Preloader({ onComplete }) {
  const rootRef = useRef(null);
  const percentRef = useRef(null);
  const fillRef = useRef(null);
  const dockRef = useRef(null);
  const [done, setDone] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setTyped(TITLE.length);
      return undefined;
    }
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setTyped(Math.min(n, TITLE.length));
      if (n >= TITLE.length) window.clearInterval(id);
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fill = fillRef.current;
    const percentEl = percentRef.current;

    const setPct = (v) => {
      const n = Math.round(Math.max(0, Math.min(100, v)));
      if (percentEl) percentEl.textContent = `${n}%`;
    };

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      setPct(100);
      if (fill) gsap.set(fill, { scaleX: 1 });
      onComplete?.();
      if (prefersReducedMotion() || !rootRef.current) {
        setDone(true);
        return;
      }
      const exit = gsap.timeline({ onComplete: () => setDone(true) });
      if (dockRef.current) {
        exit.to(dockRef.current, { y: 36, opacity: 0, duration: 0.32, ease: 'power2.in' });
      }
      exit.to(rootRef.current, { opacity: 0, duration: 0.48, ease: 'power2.inOut' }, dockRef.current ? '-=0.12' : 0);
    };

    const failsafe = window.setTimeout(finish, FAILSAFE_MS);

    if (prefersReducedMotion()) {
      finish();
      return () => {
        cancelled = true;
        window.clearTimeout(failsafe);
      };
    }

    if (dockRef.current) {
      gsap.fromTo(
        dockRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }

    let barTween = null;
    if (fill) {
      gsap.set(fill, { scaleX: 0 });
      barTween = gsap.to(fill, {
        scaleX: 1,
        duration: PROGRESS_MS / 1000,
        ease: 'none',
        onUpdate() {
          setPct(this.progress() * 100);
        },
        onComplete: finish,
      });
    } else {
      finish();
    }

    loadAssets().catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      barTween?.kill();
    };
  }, [onComplete]);

  if (done) return null;

  const shown = TITLE.slice(0, typed);
  const [line1 = '', line2 = ''] = shown.split('\n');
  const onLine2 = shown.includes('\n');
  const finished = typed >= TITLE.length;
  const live = [line1, line2];

  return (
    <div
      ref={rootRef}
      className="preloader fixed inset-0 z-[100] overflow-hidden text-cartoon-cream"
      aria-busy="true"
      aria-live="polite"
    >
      <h1 className="preloader-title">
        <span className="sr-only">Dawn Bad Frogs</span>
        {TITLE_LINES.map((line, i) => {
          const showCaret = !finished && ((i === 0 && !onLine2) || (i === 1 && onLine2));
          return (
            <span key={line} className="preloader-title-line" aria-hidden="true">
              <span className="preloader-title-ghost slime-type">{line}</span>
              <span className="preloader-title-live">
                <span className="slime-type">{live[i]}</span>
                {showCaret ? <span className="preloader-caret" /> : null}
              </span>
            </span>
          );
        })}
      </h1>

      <div
        ref={dockRef}
        className="preloader-dock absolute bottom-0 left-0 right-0 z-10 px-5 md:px-8 pb-6 md:pb-8 pt-4"
      >
        <p
          ref={percentRef}
          className="preloader-percent mb-3 md:mb-4 text-4xl md:text-6xl font-bold tracking-tight tabular-nums text-cartoon-cream [text-shadow:3px_3px_0_#111314]"
        >
          0%
        </p>

        <div className="preloader-row flex w-full items-center gap-3 md:gap-4">
          <span className="preloader-mark preloader-mark-d" aria-hidden="true" />

          <div className="preloader-capsule relative h-7 md:h-9 flex-1 overflow-hidden rounded-xl border-[3px] border-cartoon-ink bg-cartoon-sky shadow-[3px_3px_0_#111314]">
            <div ref={fillRef} className="preloader-fill" />
          </div>

          <span className="preloader-mark preloader-mark-star" aria-hidden="true" />

          <span className="preloader-brand slime-type slime-type--nav text-3xl md:text-5xl font-bold lowercase leading-none tracking-tight">
            dbf
          </span>
        </div>
      </div>
    </div>
  );
}
