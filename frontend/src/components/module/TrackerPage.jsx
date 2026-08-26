import ModuleShell, { StatCard, ProgressBar } from './ModuleShell';
import ConnectGate from '../ConnectGate';
import { TOKEN_SYMBOL } from '../../lib/config';
import { formatDbf, shortAddress } from '../../lib/format';
import { useClaims, useTracker } from '../../hooks/useDbfData';
import { useSolanaWallet } from '../../hooks/useSolanaWallet';

export default function TrackerPage({ active = true, onBack }) {
  const { address: wallet } = useSolanaWallet();
  const { epoch, me, checkpoints, loading, connected } = useTracker(wallet);
  const {
    claims,
    claimable,
    busy,
    message,
    claim,
    apiReady,
    loading: claimsLoading,
  } = useClaims(wallet);

  const claimedCount = claims.filter((c) => c.status === 'claimed').length;
  const claimHint = (() => {
    if (claimable.length > 0) return null;
    if (claimedCount > 0) {
      return `Wallet ${shortAddress(wallet)} already claimed ${claimedCount} settled epoch${
        claimedCount === 1 ? '' : 's'
      }. New rewards show up after the next Monday 00:00 UTC settle.`;
    }
    if (claims.some((c) => c.status === 'expired')) {
      return `Past rewards for ${shortAddress(wallet)} expired. Only open claims within 14 days can be collected.`;
    }
    return `No settled rewards for ${shortAddress(wallet)} yet. Rank on the leaderboard with verified losses — claim rows appear after epoch settle.`;
  })();

  return (
    <ModuleShell
      title="Tracker"
      subtitle="Epoch progress, rank, and reward estimates as the week unfolds"
      badge={epoch.label}
      badgeClass="bg-pond-red text-cartoon-cream"
      active={active}
      onBack={onBack}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Epoch progress"
          value={`${Math.round(epoch.progress)}%`}
          hint={`${epoch.daysLeft} day${epoch.daysLeft === 1 ? '' : 's'} left`}
          accent="text-pond-red"
        />
        <StatCard
          label="Your rank"
          value={connected && me ? `#${me.rank}` : '—'}
          hint={connected ? (me ? 'On this epoch board' : 'Not ranked yet') : 'Connect to see rank'}
          accent="text-pond-green"
        />
        <StatCard
          label="Reward est."
          value={connected && me ? formatDbf(me.expected_dbf_reward) : '—'}
          hint="If epoch ended now"
          accent="text-cartoon-yellow"
        />
      </div>

      <div data-mod-block className="toon-panel mb-6 p-5 md:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
            Weekly epoch
          </h3>
          <span className="text-xs font-bold text-cartoon-cream/60">{epoch.rangeLabel}</span>
        </div>
        <ProgressBar value={epoch.progress} color="#FF5C7A" />
        <p className="mt-3 text-sm font-semibold text-cartoon-cream/70">
          Losses keep stacking until Monday 00:00 UTC. Climb the rekt board before payout.
        </p>
      </div>

      {!connected && (
        <div className="mb-6">
          <ConnectGate
            title="Track your rank live"
            body={`Connect a Solana wallet to see rank and estimated ${TOKEN_SYMBOL} for this epoch.`}
          />
        </div>
      )}

      {connected && loading && (
        <div className="toon-panel h-40 animate-pulse bg-cartoon-cream/5" />
      )}

      {connected && !claimsLoading && (
        <div data-mod-block className="toon-panel mb-6 p-5 md:p-6">
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
            Claim
          </h3>
          {claimable.length === 0 ? (
            <p className="text-sm font-semibold leading-relaxed text-cartoon-cream/70">{claimHint}</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {claimable.map((row) => (
                <li
                  key={row.id || row.week_index}
                  className="flex items-center justify-between text-sm font-bold"
                >
                  <span className="text-cartoon-cream">Epoch week {row.week_index}</span>
                  <span className="text-pond-green">{formatDbf(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={!claimable.length || busy || !apiReady}
            onClick={claim}
            className="toon-btn cursor-pointer bg-pond-green px-5 py-2 text-sm text-cartoon-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Claiming…' : `Claim ${TOKEN_SYMBOL}`}
          </button>
          {message && (
            <p className="mt-3 text-xs font-bold text-cartoon-cream/55">{message}</p>
          )}
          {!apiReady && (
            <p className="mt-2 text-xs font-bold text-cartoon-cream/45">
              Claim API offline — set VITE_API_URL to the Railway backend URL.
            </p>
          )}
          {apiReady && claimable.length === 0 && (
            <p className="mt-2 text-xs font-bold text-cartoon-cream/45">
              API online · waiting on a claimable row for this wallet in Supabase.
            </p>
          )}
        </div>
      )}

      <div data-mod-block className="toon-panel overflow-hidden">
        <div className="border-b-[3px] border-cartoon-ink bg-[#12263A]/90 px-5 py-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
            Checkpoint status
          </h3>
        </div>
        <ul className="divide-y divide-cartoon-ink/30">
          {checkpoints.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 px-5 py-4">
              <span className="text-sm font-bold text-cartoon-cream">{item.label}</span>
              <span
                className={`rounded-lg border-2 border-cartoon-ink px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                  item.done
                    ? 'bg-pond-green text-cartoon-ink'
                    : 'bg-[#12263A] text-cartoon-cream/55'
                }`}
              >
                {item.done ? 'Done' : 'Pending'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ModuleShell>
  );
}
