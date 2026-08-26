import ModuleShell, { StatCard } from './ModuleShell';
import { TOKEN_MINT, TOKEN_SYMBOL, TREASURY_WALLET } from '../../lib/config';
import { formatDbf, formatUsd, formatUtc, shortAddress } from '../../lib/format';
import { useTreasury } from '../../hooks/useDbfData';

function formatAmt(n, digits = 4) {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export default function TreasuryPage({ active = true, onBack }) {
  const { epoch, traders, flows, snapshot, live, rewardPool, loading } = useTreasury();
  const wallet = live?.wallet || TREASURY_WALLET;
  const sol = live?.sol;
  const dbf = live?.dbf;
  const totalUsd = live?.balanceUsd ?? snapshot?.balance_usd;
  const coinLive = Boolean(TOKEN_MINT) && Number(dbf || 0) > 0;
  const explorer = `https://solscan.io/account/${wallet}`;

  return (
    <ModuleShell
      title="Treasury"
      subtitle={`Live balances from the project wallet · ${shortAddress(wallet)}`}
      badge="On-chain"
      badgeClass="bg-cartoon-yellow text-cartoon-ink"
      active={active}
      onBack={onBack}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="SOL"
          value={sol != null ? formatAmt(sol, 4) : 'Reading wallet'}
          hint={live ? `${formatUsd(live.solValueUsd)} · treasury wallet` : 'Waiting on RPC'}
          accent="text-cartoon-yellow"
        />
        <StatCard
          label={TOKEN_SYMBOL}
          value={dbf != null ? formatAmt(dbf, 2) : '—'}
          hint={
            !TOKEN_MINT
              ? 'CA not set yet'
              : coinLive
                ? formatUsd(live.dbfValueUsd)
                : 'Coin not live · balance 0'
          }
          accent="text-pond-green"
        />
        <StatCard
          label="Total"
          value={totalUsd != null ? formatUsd(totalUsd) : '—'}
          hint={`Next epoch ${formatUtc(epoch.end)}`}
          accent="text-[#01D1FD]"
        />
      </div>

      <p className="mb-6 text-center text-xs font-semibold text-cartoon-cream/50">
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cartoon-yellow hover:text-cartoon-cream"
        >
          {shortAddress(wallet, 6, 6)}
        </a>
        {' · '}
        {traders.length} ranked wallet{traders.length === 1 ? '' : 's'} this epoch
        {rewardPool > 0 ? ` · ${formatDbf(rewardPool)} estimated pool` : ''}
      </p>

      <div data-mod-block className="toon-panel mb-6 overflow-hidden">
        <div className="border-b-[3px] border-cartoon-ink bg-[#2C3133]/90 px-5 py-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
            Recent flows
          </h3>
        </div>
        {loading ? (
          <div className="h-40 animate-pulse bg-cartoon-cream/5" />
        ) : flows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm font-semibold text-cartoon-cream/55">
            Treasury is the live wallet above. Transfers will list here when the feed is connected.
          </p>
        ) : (
          <ul className="divide-y divide-cartoon-ink/30">
            {flows.map((f) => {
              const incoming = f.type === 'in' || Number(f.amount) > 0;
              const amount = Math.abs(Number(f.amount || 0));
              return (
                <li key={f.id || f.label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm font-bold text-cartoon-cream">
                    {f.label || f.note || 'Flow'}
                  </span>
                  <span
                    className={`text-sm font-extrabold ${
                      incoming ? 'text-pond-green' : 'text-pond-red'
                    }`}
                  >
                    {incoming ? '+' : '-'}
                    {formatUsd(amount, { digits: 0 })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModuleShell>
  );
}
