import { useNavigate } from 'react-router-dom';
import {
  COPYRIGHT_LINE,
  FOOTER_BLURB,
  SOCIAL,
  TOKEN_SYMBOL,
} from '../lib/config';

const PRODUCT_LINKS = [
  { label: 'Pond', href: '/pond' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Portfolio', href: '/portfolio' },
  ...(SOCIAL.pools
    ? [
        {
          label: `Get ${TOKEN_SYMBOL}`,
          href: SOCIAL.pools,
          external: true,
        },
      ]
    : []),
];

const PROTOCOL_LINKS = [
  { label: 'Tracker', href: '/tracker' },
  { label: 'Treasury', href: '/treasury' },
  { label: 'NFT', href: '/nft' },
  { label: 'Docs', href: '/docs' },
  ...(SOCIAL.x ? [{ label: 'X', href: SOCIAL.x, external: true }] : []),
];

export default function Footer({ onNavigate }) {
  const navigate = useNavigate();
  const go = (href, external) => {
    if (external) return;
    if (onNavigate) onNavigate(href);
    else navigate(href);
  };

  return (
    <footer id="footer" className="site-footer relative z-[2] overflow-hidden border-t border-white/10">
      <div className="footer-space-bg" aria-hidden="true" />
      <div className="footer-watermark" aria-hidden="true">
        dbf
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8 pt-16 pb-8">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between md:gap-16">
          <div className="max-w-md">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pond-green text-sm font-black text-black shadow-[0_0_20px_rgba(0,199,73,0.45)]">
                D
              </span>
              <span className="text-2xl font-bold lowercase tracking-tight text-white">
                dbf
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">{FOOTER_BLURB}</p>
          </div>

          <div className="flex flex-wrap gap-12 md:gap-16">
            <div>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-pond-green">
                Product
              </h3>
              <ul className="space-y-2.5">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => go(link.href)}
                        className="cursor-pointer bg-transparent p-0 text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-pond-green">
                Protocol
              </h3>
              <ul className="space-y-2.5">
                {PROTOCOL_LINKS.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => go(link.href)}
                        className="cursor-pointer bg-transparent p-0 text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.12em] text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{COPYRIGHT_LINE}</p>
          <p className="text-gray-400">Off-chain treasury · weekly epoch airdrop</p>
        </div>
      </div>
    </footer>
  );
}
