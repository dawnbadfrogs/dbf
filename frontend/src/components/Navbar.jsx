import { useEffect, useRef } from 'react';
import { APP_SHORT, SOCIAL } from '../lib/config';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { shortAddress } from '../lib/format';

const CENTER_LINKS = [
  { id: 'about', label: 'About' },
  { id: 'faq', label: 'Faq' },
  { id: 'docs', label: 'Docs' },
];

const Navbar = ({
  onLogoClick,
  showCenterNav = false,
  onHub,
  onNavLink,
  activeNav = null,
}) => {
  const { ready, connected, address: walletAddress, connect, disconnect } = useSolanaWallet();
  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const onScroll = () => {
      const scrolled = window.scrollY > 40;
      nav.classList.toggle('nav-scrolled', scrolled);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      ref={navRef}
      className="navbar-glass fixed top-0 left-0 right-0 z-40 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 md:gap-3 md:px-6 py-4 transition-colors duration-300"
    >
      <div className="flex items-center justify-start gap-2 md:gap-3">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex cursor-pointer items-center gap-2"
        >
          <span className="text-xl font-black tracking-wider text-pond-green [text-shadow:2px_2px_0_#1A1030]">
            {APP_SHORT}
          </span>
          <span className="rounded-lg border-[2.5px] border-cartoon-ink bg-pond-green px-2 py-0.5 text-[10px] font-bold text-cartoon-ink shadow-[2px_2px_0_#1A1030]">
            SOL
          </span>
        </button>
        {showCenterNav && onHub && (
          <button
            type="button"
            onClick={onHub}
            className="cursor-pointer text-xs font-bold text-cartoon-yellow transition-colors hover:text-cartoon-cream"
          >
            ← Pond
          </button>
        )}
      </div>

      <div
        className="nav-center-links flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:gap-x-7"
        style={{
          visibility: showCenterNav ? 'visible' : 'hidden',
          opacity: showCenterNav ? 1 : 0,
        }}
        aria-hidden={!showCenterNav}
      >
        {CENTER_LINKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            data-nav-link
            onClick={() => onNavLink?.(id)}
            className={`nav-type-link cursor-pointer border-0 bg-transparent p-0 ${
              activeNav === id ? 'nav-type-link--active' : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-4">
        {SOCIAL.x ? (
          <a
            href={SOCIAL.x}
            target="_blank"
            rel="noopener noreferrer"
            className="toon-btn hidden h-9 w-9 items-center justify-center bg-pond-green text-sm font-black text-cartoon-ink md:inline-flex"
            aria-label="X (Twitter)"
          >
            X
          </a>
        ) : null}
        {ready && connected ? (
          <button
            onClick={disconnect}
            className="toon-btn cursor-pointer bg-pond-green px-3 py-2 text-xs text-cartoon-ink md:px-4 md:text-sm"
          >
            {walletAddress ? shortAddress(walletAddress) : 'Disconnect'}
          </button>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={connect}
            className="toon-btn cursor-pointer bg-pond-green px-3 py-2 text-xs text-cartoon-ink disabled:opacity-60 md:px-4 md:text-sm"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
