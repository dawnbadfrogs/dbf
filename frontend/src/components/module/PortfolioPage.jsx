import ModuleShell, { StatCard } from './ModuleShell';
import ConnectGate from '../ConnectGate';
import { formatUsd } from '../../lib/format';
import { usePortfolio } from '../../hooks/useDbfData';
import { useSolanaWallet } from '../../hooks/useSolanaWallet';

export default function PortfolioPage({ active = true, onBack }) {
  const { address: wallet } = useSolanaWallet();
  const { connected, me, positions, openValue, unrealized, realized, loading, empty } =
    usePortfolio(wallet);

  return (
    <ModuleShell
      title="Portfolio"
      subtitle="Open positions, cost basis, and realized PnL feeding Rekt to Earn"
      badge={connected ? (me ? 'Live wallet' : 'No epoch row yet') : 'Wallet required'}
      badgeClass={me ? 'bg-[#5EC8FF] text-cartoon-ink' : 'bg-cartoon-yellow text-cartoon-ink'}
      active={active}
      onBack={onBack}
    >
      {!connected && (
        <ConnectGate
          title="Connect to sync positions"
          body="Your verified Solana trades and cost basis show up here once the wallet is linked to this epoch."
        />
      )}

      {connected && loading && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="toon-panel h-28 animate-pulse bg-cartoon-cream/5" />
          ))}
        </div>
      )}

      {connected && !loading && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Open value"
              value={formatUsd(openValue)}
              hint={positions.length ? `${positions.length} position(s)` : 'No open lots'}
              accent="text-[#5EC8FF]"
            />
            <StatCard
              label="Unrealized PnL"
              value={formatUsd(unrealized, { signed: true })}
              hint="Marked vs cost basis"
              accent={unrealized < 0 ? 'text-pond-red' : 'text-pond-green'}
            />
            <StatCard
              label="Realized PnL"
              value={formatUsd(realized, { signed: true })}
              hint="Counts toward rekt rank"
              accent={realized < 0 ? 'text-pond-red' : 'text-pond-green'}
            />
          </div>

          <div data-mod-block className="toon-panel overflow-hidden">
            <div className="border-b-[3px] border-cartoon-ink bg-[#2C3133]/90 px-5 py-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
                Open positions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-cartoon-ink/40">
                    {['Asset', 'Side', 'Size', 'Cost basis', 'Unrealized'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-cartoon-cream/45"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cartoon-ink/30">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-cartoon-cream/55">
                        {empty
                          ? 'This wallet is not on the epoch board yet. Losses post after the indexer verifies trades.'
                          : 'No open positions this epoch. Realized loss still counts toward rank.'}
                      </td>
                    </tr>
                  ) : (
                    positions.map((row) => (
                      <tr key={row.asset} className="hover:bg-cartoon-cream/[0.04]">
                        <td className="px-5 py-4 text-sm font-extrabold text-cartoon-cream">
                          {row.asset}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-lg border-2 border-cartoon-ink px-2 py-0.5 text-xs font-bold ${
                              row.side === 'Long'
                                ? 'bg-pond-green/20 text-pond-green'
                                : 'bg-pond-red/20 text-pond-red'
                            }`}
                          >
                            {row.side}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-cartoon-cream/80">
                          {formatUsd(row.size)}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-cartoon-cream/70">
                          {formatUsd(row.cost, { digits: row.cost < 1 ? 6 : 2 })}
                        </td>
                        <td
                          className={`px-5 py-4 text-sm font-extrabold ${
                            row.pnl < 0 ? 'text-pond-red' : 'text-pond-green'
                          }`}
                        >
                          {formatUsd(row.pnl, { signed: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </ModuleShell>
  );
}
