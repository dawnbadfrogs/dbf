import { useEffect, useState } from 'react';
import { APP_NAME, SOCIAL, SOCIAL_HANDLE, TOKEN_SYMBOL } from '../lib/config';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FAQ_ITEMS = [
  {
    q: 'What is Dawn Bad Frogs?',
    a: 'DBF is a Rekt to Earn experience on Solana. Your worst trades can still earn. Losses feed the weekly leaderboard and $DBF rewards.',
  },
  {
    q: 'How does Rekt-to-Earn work?',
    a: 'Connect your wallet, take the L during the epoch, and climb the Rekt Leaderboard. Bigger verified losses can mean bigger expected rewards from the treasury.',
  },
  {
    q: 'Do I need to connect a wallet?',
    a: 'You can explore the pond without connecting. Connect when you want to track losses, see reward estimates, or follow treasury updates.',
  },
  {
    q: 'When are rewards paid?',
    a: 'Rewards are calculated per weekly epoch and distributed from the central treasury once that epoch settles. Exact timing can shift with network conditions.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. DBF is entertainment + onchain culture. Nothing here is investment, trading, or financial advice. DYOR and never risk more than you can lose.',
  },
];

function InfoShell({ eyebrow, title, children, onBack }) {
  return (
    <section className="space-section relative min-h-[100svh] py-24 md:py-28">
      <div className="space-section-bg" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 md:px-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 cursor-pointer text-xs font-bold text-cartoon-yellow transition-colors hover:text-cartoon-cream"
          >
            ← Pond
          </button>
        )}
        <p className="nav-type-link mb-3 text-left">{eyebrow}</p>
        <h1 className="module-title">
          {title}
        </h1>
        <div className="mt-8 space-y-4">{children}</div>
      </div>
    </section>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div className={`toon-panel p-5 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function AboutPage({ onBack }) {
  return (
    <InfoShell eyebrow="About" title={APP_NAME} onBack={onBack}>
      <Panel>
        <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/85 md:text-base">
          Dawn Bad Frogs turns rekt energy into a game. We built a cartoon underwater pond where
          traders swim through modules — leaderboard, portfolio, tracker, treasury, and NFT —
          all powered by weekly epochs on Solana.
        </p>
      </Panel>
      <Panel>
        <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">The vibe</h2>
        <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/80 md:text-base">
          Loss is inevitable. Rewards do not have to be. DBF celebrates the chaos with
          transparent rankings, treasury-funded {TOKEN_SYMBOL} drops, and holder perks that keep the
          season feeling alive.
        </p>
      </Panel>
      <Panel>
        <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">What you can do</h2>
        <ul className="space-y-2 text-sm font-semibold text-cartoon-cream/80 md:text-base">
          <li>· Explore the pond hub and enter live modules</li>
          <li>· Climb the Rekt Leaderboard each epoch</li>
          <li>· Watch treasury flows · mint Bad Frog Genesis at $1</li>
          <li>· Connect when you are ready to play for real</li>
        </ul>
      </Panel>
    </InfoShell>
  );
}

export function FaqPage({ onBack }) {
  return (
    <InfoShell eyebrow="Faq" title="Frequently asked" onBack={onBack}>
      {FAQ_ITEMS.map((item) => (
        <Panel key={item.q}>
          <h2 className="mb-2 text-base font-extrabold text-cartoon-yellow md:text-lg">
            {item.q}
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/80 md:text-base">
            {item.a}
          </p>
        </Panel>
      ))}
    </InfoShell>
  );
}

export function DocsPage({ onBack }) {
  return (
    <InfoShell eyebrow="Docs" title="Protocol docs" onBack={onBack}>
      <Panel>
        <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">Getting started</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm font-semibold text-cartoon-cream/80 md:text-base">
          <li>Hit Get Started and dive into the pond.</li>
          <li>
            Swim to a module frog and click it. URLs are shareable: /leaderboard, /portfolio, /tracker, /treasury, /nft.
          </li>
          <li>Connect wallet when you want live rank, positions, and reward estimates.</li>
        </ol>
      </Panel>
      <Panel>
        <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">Rekt to Earn</h2>
        <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/80 md:text-base">
          Each epoch runs Monday 00:00 UTC to the next Monday. Verified realized losses on Solana
          rank wallets on the Rekt Leaderboard. Expected {TOKEN_SYMBOL} is sized from the treasury and
          paid at epoch close from the central wallet. Nothing here is financial advice.
        </p>
      </Panel>
      <Panel>
        <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">PnL engine</h2>
        <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/80 md:text-base">
          Cost basis uses weighted average per asset. Buys add to inventory; sells realize PnL against
          average cost. Rank uses realized loss for the epoch, not mark-to-market. Trades ingest into
          <code className="mx-1 text-cartoon-yellow">trades</code> /{' '}
          <code className="text-cartoon-yellow">positions</code> when the indexer is live; until then
          the board reads the public <code className="mx-1 text-cartoon-yellow">traders</code> table.
        </p>
      </Panel>
      <Panel>
        <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">Modules</h2>
        <ul className="space-y-2 text-sm font-semibold text-cartoon-cream/80 md:text-base">
          <li>
            <span className="text-pond-green">Rekt Leaderboard</span> live ranking by weekly loss.
          </li>
          <li>
            <span className="text-[#5EC8FF]">Portfolio</span> wallet positions and realized PnL.
          </li>
          <li>
            <span className="text-pond-red">Tracker</span> real epoch clock, rank, reward estimate.
          </li>
          <li>
            <span className="text-cartoon-yellow">Treasury</span> epoch pool and treasury flows.
          </li>
          <li>
            <span className="text-[#FE77BC]">NFT</span> Bad Frog Genesis is live — $1, supply 1,111, 100% public, minted on LaunchMyNFT.
          </li>
        </ul>
      </Panel>
      {SOCIAL.x ? (
        <Panel>
          <h2 className="mb-2 text-lg font-extrabold text-cartoon-yellow">Links</h2>
          <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/80 md:text-base">
            Follow epoch calls on{' '}
            <a
              href={SOCIAL.x}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pond-green underline decoration-pond-green/50 underline-offset-2 hover:decoration-pond-green"
            >
              X {SOCIAL_HANDLE}
            </a>
            . Schema for extra tables lives in <code className="text-cartoon-yellow">supabase/schema.sql</code>.
          </p>
        </Panel>
      ) : null}
    </InfoShell>
  );
}

const INFO_PAGE_MAP = {
  about: AboutPage,
  faq: FaqPage,
  docs: DocsPage,
};

const INFO_SWAP_MS = 260;

/** Crossfade between About / Faq / Docs nav tabs */
export function InfoPageRouter({ page, onBack }) {
  const [shown, setShown] = useState(page);
  const [anim, setAnim] = useState('visible');

  useEffect(() => {
    if (page === shown) return undefined;

    if (prefersReducedMotion()) {
      setShown(page);
      setAnim('visible');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return undefined;
    }

    setAnim('exit');
    const swap = window.setTimeout(() => {
      setShown(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAnim('enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnim('visible'));
      });
    }, INFO_SWAP_MS);

    return () => window.clearTimeout(swap);
  }, [page, shown]);

  const Page = INFO_PAGE_MAP[shown] || AboutPage;

  return (
    <div className={`info-page-view info-page-view--${anim}`}>
      <Page onBack={onBack} />
    </div>
  );
}
