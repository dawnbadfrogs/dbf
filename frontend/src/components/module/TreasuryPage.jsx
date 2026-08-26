import ModuleShell, { StatCard } from './ModuleShell';
import { TOKEN_SYMBOL } from '../../lib/config';
import { formatDbf, formatUsd, formatUtc } from '../../lib/format';
import { useTreasury } from '../../hooks/useDbfData';

export default function TreasuryPage({ active = true, onBack }) {
  const { epoch, traders, flows, snapshot, rewardPool, loading } = useTreasury();
  const balance = snapshot?.balance_usd;
  const epochIn = snapshot?.epoch_in_usd;

  return (
    <ModuleShell
      title="Treasury"
      subtitle={`Central pool funding weekly ${TOKEN_SYMBOL} rewards. Live numbers come from verified epoch data.`}
      badge="Epoch pool"
      badgeClass="bg-cartoon-yellow text-cartoon-ink"
      active={active}
      onBack={onBack}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Treasury balance"
          value={balance != null ? formatUsd(balance, { digits: 0 }) : 'Awaiting feed'}
          hint={snapshot ? 'On-chain snapshot' : 'No treasury_snapshots row yet'}
          accent="text-cartoon-yellow"
        />
        <StatCard
          label="This epoch reward pool"
          value={formatDbf(rewardPool)}
          hint={`${traders.length} ranked wallet${traders.length === 1 ? '' : 's'}`}
          accent="text-pond-green"
        />
        <StatCard
          label="Next airdrop"
          value={formatUtc(epoch.end)}
          hint="Epoch close"
          accent="text-[#01D1FD]"
        />
      </div>

      <div data-mod-block className="toon-panel mb-6 overflow-hidden">
        <div className="border-b-[3px] border-cartoon-ink bg-[#12263A]/90 px-5 py-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
            Recent flows
          </h3>
        </div>
        {loading ? (
          <div className="h-40 animate-pulse bg-cartoon-cream/5" />
        ) : flows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm font-semibold text-cartoon-cream/55">
            On-chain flow feed is not connected yet
            {epochIn != null ? ` · epoch in ${formatUsd(epochIn)}` : ''}.
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

      <div data-mod-block className="toon-panel p-5 text-center md:p-6">
        <p className="text-sm font-semibold text-cartoon-cream/75">
          Airdrop status:{' '}
          <span className="font-extrabold text-pond-green">
            {rewardPool > 0 ? 'Pool sized from live ranks · pays at epoch close' : 'Waiting for ranked losses'}
          </span>
        </p>
      </div>
    </ModuleShell>
  );
}
