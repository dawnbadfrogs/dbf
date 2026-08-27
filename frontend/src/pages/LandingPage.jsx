import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import HeroCanvas from '../components/HeroCanvas';
import Preloader from '../components/Preloader';
import GalaxyHub from '../components/GalaxyHub';
import Footer from '../components/Footer';
import Leaderboard from '../components/Leaderboard';
import PortfolioPage from '../components/module/PortfolioPage';
import TrackerPage from '../components/module/TrackerPage';
import TreasuryPage from '../components/module/TreasuryPage';
import NftPage from '../components/module/NftPage';
import { InfoPageRouter } from '../components/InfoPages';
import { usePointerParallax } from '../hooks/usePointerParallax';
import { INFO_IDS, MODULE_IDS } from '../lib/config';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function parseRoute(pathname) {
  const p = (pathname.replace(/\/$/, '') || '/') ;
  if (p === '/') return { view: 'hero' };
  if (p === '/pond') return { view: 'hub' };
  const id = p.slice(1);
  if (MODULE_IDS.includes(id)) return { view: 'module', id };
  if (INFO_IDS.includes(id)) return { view: 'info', id };
  return { view: 'hero' };
}

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => parseRoute(location.pathname), [location.pathname]);
  const [introReady, setIntroReady] = useState(false);
  const [diving, setDiving] = useState(false);
  const moduleRef = useRef(null);
  const infoRef = useRef(null);
  const hubRef = useRef(null);
  const transitioning = useRef(false);
  const prevPhaseRef = useRef(null);
  const travelRef = useRef(0);

  const phase = diving
    ? 'diving'
    : route.view === 'hero'
      ? 'hero'
      : route.view === 'hub'
        ? 'hub'
        : route.view === 'module'
          ? 'module'
          : 'info';

  const parallaxOn = phase === 'hero' || phase === 'hub' || phase === 'diving';
  const mouseRef = usePointerParallax(parallaxOn);
  // WebGL pond on hero + hub; CSS-only on module/info pages (lighter scroll/UI)
  const webglPond = phase === 'hero' || phase === 'diving' || phase === 'hub';

  const canvasMode = diving ? 'diving' : phase === 'hero' ? 'idle' : 'settled';
  const module = route.view === 'module' ? route.id : null;
  const infoPage = route.view === 'info' ? route.id : null;

  const handlePreloaderComplete = useCallback(() => setIntroReady(true), []);

  useLayoutEffect(() => {
    if (!introReady) return undefined;
    const pond = document.querySelector('.galaxy-bg');
    const hero = document.querySelector('.hero-stage');
    const nav = document.querySelector('.navbar-glass');
    if (prefersReducedMotion()) {
      if (pond) gsap.set(pond, { scale: 1 });
      if (hero) gsap.set(hero, { scale: 1, opacity: 1 });
      if (nav) gsap.set(nav, { y: 0, opacity: 1 });
      return undefined;
    }
    const tl = gsap.timeline();
    if (pond) {
      gsap.set(pond, { scale: 1.14 });
      tl.to(pond, { scale: 1, duration: 0.9, ease: 'power3.out' }, 0);
    }
    if (hero) {
      gsap.set(hero, { scale: 0.92, opacity: 0 });
      tl.to(hero, { scale: 1, opacity: 1, duration: 0.72, ease: 'power3.out' }, 0.06);
    }
    if (nav) {
      gsap.set(nav, { y: -18, opacity: 0 });
      tl.to(nav, { y: 0, opacity: 1, duration: 0.48, ease: 'power2.out' }, 0.12);
    }
    return () => tl.kill();
  }, [introReady]);

  const enterHub = useCallback(() => {
    if (transitioning.current || phase !== 'hero') return;
    transitioning.current = true;
    if (prefersReducedMotion()) {
      navigate('/pond');
      transitioning.current = false;
      return;
    }
    setDiving(true);
  }, [navigate, phase]);

  useEffect(() => {
    if (!diving) return undefined;
    const t = window.setTimeout(() => {
      setDiving(false);
      transitioning.current = false;
      navigate('/pond');
    }, 380);
    return () => window.clearTimeout(t);
  }, [diving, navigate]);

  useEffect(() => {
    if (phase === 'hero') return undefined;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase === 'info' && prev === 'info') return undefined;
    window.scrollTo({ top: 0, behavior: 'auto' });
    return undefined;
  }, [phase, module, infoPage]);

  const openModule = useCallback((id) => navigate(`/${id}`), [navigate]);
  const openInfo = useCallback((id) => {
    travelRef.current = 0;
    navigate(`/${id}`);
  }, [navigate]);
  const goHub = useCallback(() => {
    travelRef.current = 0;
    navigate('/pond');
  }, [navigate]);
  const goHome = useCallback(() => {
    travelRef.current = 0;
    transitioning.current = false;
    setDiving(false);
    navigate('/');
  }, [navigate]);

  const showHero = phase === 'hero' || phase === 'diving';
  const showHub = phase === 'hub';
  const showModule = phase === 'module';
  const showInfo = phase === 'info';
  const showCenterNav = phase === 'hub' || phase === 'module' || phase === 'info';
  const showStarsBack = phase === 'module' || phase === 'info';
  const showFooter = introReady && (showHub || showModule || showInfo);

  return (
    <>
      <Preloader onComplete={handlePreloaderComplete} />
      <div className="app-shell relative min-h-screen overflow-x-clip text-white">
        <div className="galaxy-bg" aria-hidden="true">
          <HeroCanvas
            mode={canvasMode}
            webgl={webglPond}
            travelRef={travelRef}
            mouseRef={mouseRef}
          />
        </div>

        {introReady && (
          <Navbar
            onLogoClick={showStarsBack ? goHub : goHome}
            showCenterNav={showCenterNav}
            onHub={showStarsBack ? goHub : undefined}
            onNavLink={openInfo}
            activeNav={infoPage}
          />
        )}

        <main className="relative z-[1]">
          {showHero && introReady && (
            <HeroSection
              phase={phase}
              onGetStarted={enterHub}
            />
          )}

          {showHub && (
            <div ref={hubRef} className="experience-layer">
              <GalaxyHub
                active
                onSelect={openModule}
                travelRef={travelRef}
                mouseRef={mouseRef}
              />
            </div>
          )}

          {showModule && (
            <div ref={moduleRef} className="experience-layer">
              {module === 'leaderboard' && <Leaderboard active onBack={goHub} />}
              {module === 'portfolio' && <PortfolioPage active onBack={goHub} />}
              {module === 'tracker' && <TrackerPage active onBack={goHub} />}
              {module === 'treasury' && <TreasuryPage active onBack={goHub} />}
              {module === 'nft' && <NftPage active onBack={goHub} />}
            </div>
          )}

          {showInfo && (
            <div ref={infoRef} className="experience-layer experience-layer--info">
              <InfoPageRouter page={infoPage} onBack={goHub} />
            </div>
          )}
        </main>

        {showFooter && (
          <Footer
            onNavigate={(href) => {
              if (href.startsWith('/')) navigate(href);
            }}
          />
        )}
      </div>
    </>
  );
}
