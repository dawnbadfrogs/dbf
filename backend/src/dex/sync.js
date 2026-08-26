import { DEMO_WALLETS } from '../demoWallets.js';
import { ingestTrades } from '../ingest.js';
import { isSolanaAddress, normalizeAddress } from '../solana.js';
import { fillsFromDeltas, fillsFromHeliusTx, deltasFromParsedTx } from './parse.js';
import { getSolUsd } from './price.js';
import { attachTickers } from './symbols.js';

const DEMO = new Set(DEMO_WALLETS);
const RPC = () => process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const HELIUS_KEY = () => process.env.HELIUS_API_KEY || '';

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
    if (/too many requests/i.test(msg) && attempt < 6) {
      await sleep(700 * (attempt + 1));
      return rpc(method, params, attempt + 1);
    }
    throw new Error(msg);
  }
  return body.result;
}

async function fetchHeliusSwaps(wallet, { after, limit } = {}) {
  const key = HELIUS_KEY();
  if (!key) return null;
  const url = new URL(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`);
  url.searchParams.set('api-key', key);
  url.searchParams.set('type', 'SWAP');
  url.searchParams.set('limit', String(limit || 25));
  if (after) url.searchParams.set('after-signature', after);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius ${res.status}`);
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

async function fetchRpcSwaps(wallet, { until, limit } = {}) {
  const opts = { limit: limit || 20 };
  if (until) opts.until = until;
  const sigs = await rpc('getSignaturesForAddress', [wallet, opts]);
  const fills = [];
  const solUsd = await getSolUsd();
  for (const row of sigs || []) {
    if (row.err) continue;
    await sleep(280);
    const tx = await rpc('getTransaction', [
      row.signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
    ]);
    const deltas = deltasFromParsedTx(tx, wallet);
    if (!deltas?.signature) continue;
    fills.push(
      ...fillsFromDeltas({
        wallet,
        signature: deltas.signature,
        timestamp: deltas.timestamp,
        tokenDeltas: deltas.tokenDeltas,
        solDelta: deltas.solDelta,
        solUsd,
      })
    );
  }
  const newest = sigs?.[0]?.signature || until || null;
  return { fills, cursor: newest };
}

async function watchedWallets(supabase) {
  const extra = String(process.env.WATCH_WALLETS || '')
    .split(',')
    .map((s) => normalizeAddress(s))
    .filter(isSolanaAddress);
  const { data, error } = await supabase.from('traders').select('wallet_address');
  if (error) throw error;
  const fromDb = (data || [])
    .map((r) => normalizeAddress(r.wallet_address))
    .filter(isSolanaAddress)
    .filter((w) => !DEMO.has(w));
  return [...new Set([...fromDb, ...extra])];
}

async function cursorFor(supabase, wallet) {
  const { data } = await supabase
    .from('indexer_state')
    .select('value')
    .eq('key', `dex:${wallet}`)
    .maybeSingle();
  return data?.value || null;
}

async function saveCursor(supabase, wallet, sig) {
  if (!sig) return;
  await supabase.from('indexer_state').upsert({
    key: `dex:${wallet}`,
    value: sig,
    updated_at: new Date().toISOString(),
  });
}

async function dropDemoRows(supabase, wallet) {
  await supabase.from('trades').delete().eq('wallet_address', wallet).is('tx_hash', null);
}

function dedupeFills(fills) {
  const unique = [];
  const seen = new Set();
  for (const row of fills || []) {
    const key = `${row.tx_hash}|${row.wallet_address}|${row.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export async function syncDexFills(supabase, { limit = 20, refresh = false } = {}) {
  const wallets = await watchedWallets(supabase);
  const solUsd = await getSolUsd();
  const summary = {
    wallets: wallets.length,
    inserted: 0,
    updated: 0,
    fills: 0,
    errors: [],
    solUsd,
  };

  for (const wallet of wallets) {
    try {
      const until = refresh ? null : await cursorFor(supabase, wallet);
      let fills = [];
      let cursor = until;

      const helius = await fetchHeliusSwaps(wallet, { after: until, limit });
      if (helius) {
        for (const tx of helius) {
          fills.push(...fillsFromHeliusTx(tx, wallet, solUsd));
        }
        cursor = helius[0]?.signature || cursor;
      } else {
        const rpcResult = await fetchRpcSwaps(wallet, { until, limit });
        fills = rpcResult.fills;
        cursor = rpcResult.cursor;
      }

      const unique = await attachTickers(dedupeFills(fills));
      summary.fills += unique.length;
      if (unique.length) {
        await dropDemoRows(supabase, wallet);
        const ingested = await ingestTrades(supabase, unique);
        summary.inserted += ingested.inserted || 0;
        summary.updated += ingested.updated || 0;
      }
      await saveCursor(supabase, wallet, cursor);
      await sleep(200);
    } catch (err) {
      summary.errors.push({ wallet, error: err.message || String(err) });
    }
  }

  return summary;
}
