import ModuleShell, { StatCard } from './ModuleShell';
import { useSolanaWallet } from '../../hooks/useSolanaWallet';
import { useNfts } from '../../hooks/useDbfData';
import {
  NFT_LOOKS,
  NFT_MINT_URL,
  NFT_PRICE_LABEL,
  NFT_SUPPLY,
  NFT_UPGRADE_NOTE,
  NFT_UPGRADES,
  SOCIAL,
  SOCIAL_HANDLE,
  TOKEN_SYMBOL,
} from '../../lib/config';

const SUPPLY_LABEL = NFT_SUPPLY.toLocaleString('en-US');

export default function NftPage({ active = true, onBack }) {
  const { address: wallet } = useSolanaWallet();
  const { held, connected } = useNfts(wallet);
  const canMint = Boolean(NFT_MINT_URL);

  return (
    <ModuleShell
      title="NFT"
      subtitle={`Bad Frog Genesis · ${NFT_PRICE_LABEL} · ${SUPPLY_LABEL} supply · minted on LaunchMyNFT`}
      badge="Live"
      badgeClass="bg-[#FE77BC] text-cartoon-ink"
      active={active}
      onBack={onBack}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {NFT_LOOKS.map((look) => (
          <figure
            key={look.id}
            data-mod-block
            className="toon-panel overflow-hidden"
          >
            <div className="bg-pond-dark">
              <img
                src={look.src}
                alt={`Bad Frog Genesis ${look.name}`}
                className="aspect-square w-full object-contain"
              />
            </div>
            <figcaption className="flex items-center justify-between border-t-[3px] border-cartoon-ink px-4 py-3">
              <span className="text-sm font-extrabold uppercase tracking-wider text-cartoon-cream">
                {look.name}
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full border-2 border-cartoon-ink"
                style={{ background: look.accent }}
                aria-hidden="true"
              />
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Mint price" value={NFT_PRICE_LABEL} hint="Per NFT" accent="text-[#FE77BC]" />
        <StatCard label="Supply" value={SUPPLY_LABEL} hint="Genesis collection" accent="text-cartoon-yellow" />
        <StatCard
          label="Mint"
          value="100%"
          hint="Public"
          accent="text-pond-green"
        />
      </div>

      <div data-mod-block className="toon-panel mb-6 p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-cartoon-yellow">Genesis drop</p>
        <h3 className="mt-2 text-2xl font-extrabold text-cartoon-cream">Bad Frog Genesis</h3>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-cartoon-cream/70">
          Pond cosmetics, holder boosts, and epoch perks. Full 1,111 supply is public at {NFT_PRICE_LABEL},
          minted on LaunchMyNFT.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {canMint ? (
            <a
              href={NFT_MINT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="toon-btn inline-flex cursor-pointer bg-[#FE77BC] px-5 py-2 text-sm text-cartoon-ink"
            >
              Mint on LaunchMyNFT
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="toon-btn inline-flex bg-[#FE77BC] px-5 py-2 text-sm text-cartoon-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mint link incoming
            </button>
          )}
          {SOCIAL.x ? (
            <a
              href={SOCIAL.x}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-cartoon-yellow transition-colors hover:text-cartoon-cream"
            >
              Follow {SOCIAL_HANDLE}
            </a>
          ) : null}
        </div>
        {!canMint && (
          <p className="mt-3 text-xs font-semibold text-cartoon-cream/50">
            Collection URL drops here as soon as LaunchMyNFT is live.
          </p>
        )}
        {connected && held > 0 && (
          <p className="mt-3 text-xs font-bold text-pond-green">
            This wallet holds {held} pond NFT{held === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      <div data-mod-block className="toon-panel mb-6 overflow-hidden">
        <div className="border-b-[3px] border-cartoon-ink bg-[#2C3133]/90 px-5 py-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-cartoon-yellow">
            {TOKEN_SYMBOL} burn upgrades
          </h3>
        </div>
        <ul className="divide-y divide-cartoon-ink/30">
          {NFT_UPGRADES.map((row) => (
            <li key={row.level} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-extrabold text-cartoon-cream">{row.level}</span>
              <span className="text-sm font-semibold text-cartoon-cream/70">burn {row.burn}</span>
              <span className="text-sm font-extrabold text-pond-green">{row.multiplier}</span>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-xs font-semibold text-cartoon-cream/50">{NFT_UPGRADE_NOTE}</p>
      </div>
    </ModuleShell>
  );
}
