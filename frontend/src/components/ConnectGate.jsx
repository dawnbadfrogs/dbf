import { useSolanaWallet } from '../hooks/useSolanaWallet';

export default function ConnectGate({
  title = 'Connect wallet',
  body = 'Connect a Solana wallet to sync this module.',
}) {
  const { ready, connect } = useSolanaWallet();
  return (
    <div data-mod-block className="toon-panel p-6 text-center md:p-8">
      <p className="text-lg font-extrabold text-cartoon-cream">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-cartoon-cream/70">{body}</p>
      <button
        type="button"
        disabled={!ready}
        onClick={connect}
        className="toon-btn mt-5 cursor-pointer bg-pond-green px-5 py-2 text-sm text-cartoon-ink disabled:opacity-60"
      >
        Connect Wallet
      </button>
    </div>
  );
}
