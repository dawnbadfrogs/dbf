import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { getWalletAddress, SOLANA_WALLET_LIST } from '../lib/wallet';

/** Connect Phantom via connectWallet — login() SIWS is disabled on this Privy app. */
export function useSolanaWallet() {
  const { ready, authenticated, user, connectWallet, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const wallet = wallets[0] || null;
  const address = wallet?.address || getWalletAddress(user) || null;

  const connect = useCallback(() => {
    connectWallet({
      description: 'Connect a Solana wallet',
      walletList: SOLANA_WALLET_LIST,
    });
  }, [connectWallet]);

  const disconnect = useCallback(async () => {
    try {
      await wallet?.disconnect?.();
    } catch {
      /* wallet-standard optional */
    }
    try {
      await window.phantom?.solana?.disconnect?.();
    } catch {
      /* extension optional */
    }
    try {
      await window.solana?.disconnect?.();
    } catch {
      /* extension optional */
    }
    if (authenticated) {
      try {
        await logout();
      } catch {
        /* session optional */
      }
    }
  }, [wallet, authenticated, logout]);

  return {
    ready: Boolean(ready),
    walletsReady: Boolean(walletsReady),
    connected: Boolean(address),
    address,
    wallet,
    connect,
    disconnect,
  };
}
