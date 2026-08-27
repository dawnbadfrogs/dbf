import { TOKEN_MINT, TREASURY_WALLET } from './config';

const RPC = 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || 'RPC error');
  return body.result;
}

async function splUiAmount(wallet, mint) {
  if (!mint) return 0;
  let total = 0;
  for (const programId of [TOKEN_PROGRAM, TOKEN_2022]) {
    try {
      const result = await rpc('getTokenAccountsByOwner', [
        wallet,
        { mint, programId },
        { encoding: 'jsonParsed' },
      ]);
      for (const row of result?.value || []) {
        total += Number(row?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
      }
    } catch {
      /* mint or program may not exist yet */
    }
  }
  return total;
}

export async function readTreasuryOnchain() {
  const wallet = TREASURY_WALLET;
  const mint = TOKEN_MINT;
  const bal = await rpc('getBalance', [wallet]);
  const lamports = Number(bal?.value ?? bal ?? 0);
  const sol = lamports / 1e9;
  const dbf = await splUiAmount(wallet, mint);
  return {
    wallet,
    mint: mint || null,
    sol,
    solUsd: 0,
    solValueUsd: 0,
    dbf,
    dbfPrice: 0,
    dbfValueUsd: 0,
    balanceUsd: null,
    at: new Date().toISOString(),
  };
}
