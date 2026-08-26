import { weekIndexAt } from './engine/epoch.js';
import { isSolanaAddress, normalizeAddress } from './solana.js';

function validateTrade(row) {
  const wallet = normalizeAddress(row.wallet_address);
  if (!isSolanaAddress(wallet)) throw new Error('Invalid Solana wallet_address');
  const type = String(row.type || '').toLowerCase();
  if (type !== 'buy' && type !== 'sell') throw new Error('type must be buy or sell');
  const asset = String(row.asset || '').trim().toUpperCase();
  if (!asset) throw new Error('asset required');
  const amount = Number(row.amount);
  const price = Number(row.price);
  if (!(amount > 0) || !Number.isFinite(price)) throw new Error('amount and price required');
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  if (Number.isNaN(createdAt.getTime())) throw new Error('invalid created_at');
  return {
    wallet_address: wallet,
    asset,
    type,
    amount,
    price,
    created_at: createdAt.toISOString(),
    tx_hash: row.tx_hash || null,
    epoch_week: weekIndexAt(createdAt),
  };
}

/** Solana DEX / indexer payload → trades rows */
export function normalizeSolanaFills(payload) {
  const fills = Array.isArray(payload) ? payload : payload?.fills || payload?.trades || [];
  return fills.map((f) =>
    validateTrade({
      wallet_address: f.wallet || f.wallet_address || f.user,
      asset: f.symbol || f.asset || f.token || f.mint,
      type: f.side || f.type,
      amount: f.size || f.amount || f.quantity,
      price: f.price || f.avg_price,
      created_at: f.timestamp || f.created_at || f.time,
      tx_hash: f.tx_hash || f.signature || f.hash || f.id,
    })
  );
}

/** @deprecated use normalizeSolanaFills */
export const normalizeL2Fills = normalizeSolanaFills;

function fillKey(row) {
  return `${row.tx_hash}|${row.wallet_address}|${row.type}`;
}

/** Insert validated fills. Match tx_hash+wallet+type and refresh ticker if it changed. */
export async function ingestTrades(supabase, rows) {
  const trades = (Array.isArray(rows) ? rows : [rows]).map(validateTrade);
  if (!trades.length) return { inserted: 0, skipped: 0, updated: 0 };

  const hashes = [...new Set(trades.map((t) => t.tx_hash).filter(Boolean))];
  const byKey = new Map();
  if (hashes.length) {
    const { data, error } = await supabase
      .from('trades')
      .select('id, tx_hash, wallet_address, asset, type')
      .in('tx_hash', hashes);
    if (error) throw error;
    for (const t of data || []) byKey.set(fillKey(t), t);
  }

  const fresh = [];
  let updated = 0;
  let skipped = 0;
  for (const t of trades) {
    if (!t.tx_hash) {
      fresh.push(t);
      continue;
    }
    const prev = byKey.get(fillKey(t));
    if (!prev) {
      fresh.push(t);
      continue;
    }
    if (prev.asset !== t.asset) {
      const { error } = await supabase.from('trades').update({ asset: t.asset }).eq('id', prev.id);
      if (error) throw error;
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  if (!fresh.length) return { inserted: 0, skipped, updated };

  const { data, error } = await supabase.from('trades').insert(fresh).select('id');
  if (error) throw error;
  return {
    inserted: data?.length || fresh.length,
    skipped,
    updated,
  };
}
