import { getSolUsd } from './dex/price.js';

const RPC = () => process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export function treasuryWallet() {
  return String(process.env.TREASURY_WALLET || 'DBFnC5gJ7ZuuXafiwBLuZjMj9F2dbnBXJ1J44sA2hqwD').trim();
}

export function tokenMint() {
  return String(process.env.TOKEN_MINT || '').trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rpc(method, params, attempt = 0) {
  const res = await fetch(RPC(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) {
    const msg = body.error.message || 'RPC error';
    if (/too many requests/i.test(msg) && attempt < 5) {
      await sleep(600 * (attempt + 1));
      return rpc(method, params, attempt + 1);
    }
    throw new Error(msg);
  }
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

async function tokenUsd(mint) {
  if (!mint) return 0;
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return 0;
    const pairs = await res.json();
    const list = Array.isArray(pairs) ? pairs : [];
    list.sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));
    const px = Number(list[0]?.priceUsd || 0);
    return px > 0 ? px : 0;
  } catch {
    return 0;
  }
}

let cache = { at: 0, snap: null };

export async function readTreasuryWallet() {
  if (cache.snap && Date.now() - cache.at < 20_000) return cache.snap;
  const wallet = treasuryWallet();
  const mint = tokenMint();
  const solUsd = await getSolUsd();
  const bal = await rpc('getBalance', [wallet]);
  const lamports = Number(bal?.value ?? bal ?? 0);
  const sol = lamports / 1e9;
  const dbf = await splUiAmount(wallet, mint);
  const dbfPrice = await tokenUsd(mint);
  const solValueUsd = sol * solUsd;
  const dbfValueUsd = dbf * dbfPrice;
  const snap = {
    wallet,
    mint: mint || null,
    sol,
    solUsd,
    solValueUsd,
    dbf,
    dbfPrice,
    dbfValueUsd,
    balanceUsd: solValueUsd + dbfValueUsd,
    at: new Date().toISOString(),
  };
  cache = { at: Date.now(), snap };
  return snap;
}

export async function syncTreasury(supabase) {
  const snap = await readTreasuryWallet();
  const row = {
    balance_usd: snap.balanceUsd,
    epoch_in_usd: snap.solValueUsd,
  };
  const { error } = await supabase.from('treasury_snapshots').insert(row);
  if (error) throw error;
  return snap;
}
