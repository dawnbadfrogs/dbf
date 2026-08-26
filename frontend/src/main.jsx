import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import './index.css';
import App from './App.jsx';
import { SOLANA_WALLET_LIST } from './lib/wallet.js';

const appId = import.meta.env.VITE_PRIVY_APP_ID;

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#70C431',
          logo: '/logodbf.png',
          walletChainType: 'solana-only',
          showWalletLoginFirst: true,
          walletList: SOLANA_WALLET_LIST,
        },
        loginMethods: ['wallet', 'email'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'off',
          },
        },
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                'wss://api.mainnet-beta.solana.com'
              ),
            },
          },
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>
);
