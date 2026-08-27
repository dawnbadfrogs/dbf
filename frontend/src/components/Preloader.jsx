import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ASSETS = ['/frog.glb'];
/** Time-based 0→100% bar (asset load does not jump the UI) */
const PROGRESS_MS = 2600;
const FAILSAFE_MS = 4000;

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function loadWithProgress(onProgress) {
  return Promise.all(
    ASSETS.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      const total = Number(res.headers.get('content-length') || 0);
      if (!res.body || !total) {
        await res.blob();
        onProgress(1);
        return;
      }
      const reader = res.body.getReader();
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        onProgress(Math.min(1, loaded / total));
      }
    })
  );
}

export default function Preloader({ onComplete }) {
  const rootRef = useRef(null);
  const percentRef = useRef(null);
  const fillRef = useRef(null);
  const dockRef = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      const reveal = () => {
        setDone(true);
        onComplete?.();
      };
      if (prefersReducedMotion() || !rootRef.current) {
        reveal();
        return;
      }
      const exit = gsap.timeline({ onComplete: reveal });
      if (dockRef.current) {
        exit.to(dockRef.current, { y: 40, opacity: 0, duration: 0.35, ease: 'power2.in' });
      }
      exit.to(rootRef.current, { opacity: 0, duration: 0.4, ease: 'power2.inOut' }, dockRef.current ? '-=0.1' : 0);
    };

    const setPct = (v) => {
      const n = Math.round(Math.max(0, Math.min(100, v)));
      if (percentRef.current) percentRef.current.textContent = `${n}%`;
      if (fillRef.current) fillRef.current.style.width = `${n}%`;
    };

    const failsafe = window.setTimeout(() => {
      setPct(100);
      finish();
    }, FAILSAFE_MS);

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
        { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }
      );
    }

    const started = performance.now();
    let loadDone = false;

    const tick = window.setInterval(() => {
      if (cancelled) return;
      const elapsed = performance.now() - started;
      const t = Math.min(1, elapsed / PROGRESS_MS);
      const eased = smoothstep(t);
      setPct(t >= 1 && !loadDone ? 99 : eased * 100);

      if (t >= 1 && loadDone) {
        window.clearInterval(tick);
        setPct(100);
        finish();
      }
    }, 40);

    loadWithProgress(() => {})
      .catch(() => {})
      .finally(() => {
        loadDone = true;
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      window.clearInterval(tick);
    };
  }, [onComplete]);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="preloader fixed inset-0 z-[100] overflow-hidden text-cartoon-cream"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="preloader-world" aria-hidden="true">
        <div className="preloader-swamp" />
        <div className="preloader-caustics" />
        <div className="preloader-rays" />
        <div className="preloader-mesh" />
        <span className="preloader-ripple preloader-ripple--a" />
        <span className="preloader-ripple preloader-ripple--b" />
        <img className="preloader-mascot" src="/logodbf.png" alt="" />
        <span className="preloader-lily" style={{ '--x': '7%', '--y': '54%', '--s': '1.15', '--r': '-16deg' }} />
        <span className="preloader-lily" style={{ '--x': '76%', '--y': '50%', '--s': '0.9', '--r': '22deg' }} />
        <span className="preloader-lily preloader-lily--sm" style={{ '--x': '16%', '--y': '68%', '--s': '0.7', '--r': '8deg' }} />
        <span className="preloader-lily preloader-lily--sm" style={{ '--x': '84%', '--y': '64%', '--s': '1.05', '--r': '-8deg' }} />
        <div className="preloader-bubbles">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ '--i': i }} />
          ))}
        </div>
        <div className="preloader-sand" />
        <div className="preloader-vignette" />
      </div>

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
            <div
              ref={fillRef}
              className="preloader-fill absolute inset-y-0 left-0 w-0 rounded-lg"
            />
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
