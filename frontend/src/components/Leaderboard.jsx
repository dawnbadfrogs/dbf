import { useRef } from 'react';
import { supabaseConfigured } from '../supabaseClient';
import { addressesMatch, formatDbf, formatUsd, shortAddress } from '../lib/format';
import { useEpoch, useTraders } from '../hooks/useDbfData';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import ConnectGate from './ConnectGate';

const Leaderboard = ({ active = true, onBack }) => {
  const { address: wallet } = useSolanaWallet();
  const epoch = useEpoch();
  const { traders, loading, error } = useTraders();
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const tableRef = useRef(null);

  const you = traders.find((t) => addressesMatch(t.wallet_address, wallet));

  if (loading) {
    return (
      <section
        id="leaderboard"
        ref={sectionRef}
        className="space-section relative py-20 md:py-28"
        style={{ opacity: active ? 1 : 0 }}
      >
        <div className="space-section-bg" aria-hidden="true" />
        <div className="relative z-10 container mx-auto max-w-5xl px-4">
          <div className="mb-10 h-10 w-56 animate-pulse rounded-lg bg-white/5" />
          <div className="toon-panel overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-cartoon-ink/30 px-6 py-4 last:border-0"
              >
                <div className="h-4 w-8 animate-pulse rounded bg-cartoon-cream/10" />
                <div className="h-4 flex-1 animate-pulse rounded bg-cartoon-cream/8" />
                <div className="h-4 w-24 animate-pulse rounded bg-cartoon-cream/8" />
                <div className="h-4 w-20 animate-pulse rounded bg-cartoon-cream/8" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !supabaseConfigured) {
    return (
      <section
        id="leaderboard"
        ref={sectionRef}
        className="space-section relative py-24"
        style={{ opacity: active ? 1 : 0 }}
      >
        <div className="space-section-bg" aria-hidden="true" />
        <div className="relative z-10 container mx-auto max-w-5xl p-4 text-center">
          <div className="toon-panel mx-auto max-w-md border-pond-red bg-pond-red/15 p-6 text-pond-red">
            <p className="mb-1 text-lg font-bold">Failed to load Leaderboard</p>
            <p className="text-sm opacity-90">{error || 'Supabase is not configured.'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="leaderboard"
      ref={sectionRef}
      className="space-section relative py-20 md:py-28"
      style={{ opacity: active ? undefined : 0 }}
    >
      <div className="space-section-bg" aria-hidden="true" />
      <div className="relative z-10 container mx-auto max-w-5xl px-4">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div ref={headerRef}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mb-3 cursor-pointer text-xs font-bold text-cartoon-yellow transition-colors hover:text-cartoon-cream"
              >
                ← Pond
              </button>
            )}
            <h2 className="module-title">Rekt Leaderboard</h2>
            <p className="mt-2 text-sm font-semibold text-cartoon-cream/65">
              {epoch.label} · biggest verified losses this week
            </p>
          </div>
          <span
            data-reveal-badge
            className="self-start rounded-xl border-[3px] border-cartoon-ink bg-pond-red px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cartoon-cream shadow-[3px_3px_0_#1A1030]"
          >
            {epoch.label} · {Math.round(epoch.progress)}%
          </span>
        </div>

        {you && (
          <div data-mod-block className="toon-panel mb-6 border-pond-green p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-cartoon-yellow">You</p>
            <p className="mt-1 text-lg font-extrabold text-cartoon-cream">
              Rank #{you.rank} · {formatUsd(you.total_loss, { signed: true })} ·{' '}
              {formatDbf(you.expected_dbf_reward)}
            </p>
          </div>
        )}

        <div ref={tableRef} className="toon-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-[3px] border-cartoon-ink bg-[#12263A]/90">
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-cartoon-yellow">
                    Rank
                  </th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-cartoon-yellow">
                    Wallet / Twitter
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider text-cartoon-yellow">
                    Total Loss (USD)
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider text-cartoon-yellow">
                    Expected Reward
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cartoon-ink/40">
                {traders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8">
                      <p className="mb-4 text-center font-semibold text-cartoon-cream/50">
                        Live board · no verified rekt this epoch yet.
                      </p>
                      {!wallet && <ConnectGate title="Be first on the board" body="Connect a wallet so verified losses can attach to you this epoch." />}
                    </td>
                  </tr>
                ) : (
                  traders.map((trader) => {
                    const isTop3 = trader.rank <= 3;
                    const isYou = addressesMatch(trader.wallet_address, wallet);
                    const walletStr = shortAddress(trader.wallet_address);
                    const lossNum = Number(trader.total_loss || 0);
                    const rewardNum = Number(trader.expected_dbf_reward || 0);

                    return (
                      <tr
                        key={trader.id}
                        data-reveal-row
                        className={`leaderboard-row transition-colors duration-300 hover:bg-cartoon-cream/[0.05] ${
                          isTop3 ? 'leaderboard-row--top' : ''
                        } ${isYou ? 'bg-pond-green/10' : ''}`}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`text-base font-extrabold ${
                              isYou
                                ? 'text-cartoon-yellow'
                                : isTop3
                                  ? 'text-pond-green'
                                  : 'text-cartoon-cream/80'
                            }`}
                          >
                            #{trader.rank}
                            {isYou ? ' · you' : ''}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-cartoon-cream">{walletStr}</span>
                            {trader.twitter_handle && (
                              <span className="text-xs font-semibold text-cartoon-cream/50">
                                {trader.twitter_handle}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-extrabold text-pond-red">
                          {formatUsd(lossNum, { signed: true })}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-extrabold text-pond-green">
                          {formatDbf(rewardNum)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;
