import { allocateRewards } from './engine/rewards.js';
import { claimExpiresAt, epochBounds, getCurrentEpoch, weekIndexAt } from './engine/epoch.js';
import { getConfig } from './db.js';
import { ingestTrades } from './ingest.js';
import { runIndexer } from './indexer.js';
import { settlePastEpochs } from './settle.js';
import { isSolanaAddress, normalizeAddress } from './solana.js';

function hoursAfter(startMs, hours) {
  return new Date(startMs + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Add one live Solana wallet to demo trades, index, and open a past-week claim.
 * Does not wipe other demo rows.
 */
export async function seedWallet(supabase, rawAddress) {
  const wallet = normalizeAddress(rawAddress);
  if (!isSolanaAddress(wallet)) {
    throw new Error(`Not a Solana address: ${rawAddress}`);
  }

  const current = getCurrentEpoch();
  const pastWeek = Math.max(1, current.weekIndex - 1);
  const pastStart = epochBounds(pastWeek).starts_at.getTime();
  const liveStart = epochBounds(current.weekIndex).starts_at.getTime();

  await supabase.from('claims').delete().eq('wallet_address', wallet);
  await supabase.from('trades').delete().eq('wallet_address', wallet);

  const { inserted } = await ingestTrades(supabase, [
    { wallet_address: wallet, asset: 'SOL', type: 'buy', amount: 60, price: 180, created_at: hoursAfter(pastStart, 2) },
    { wallet_address: wallet, asset: 'SOL', type: 'sell', amount: 60, price: 88, created_at: hoursAfter(pastStart, 50) },
    { wallet_address: wallet, asset: 'JUP', type: 'buy', amount: 2500, price: 1.35, created_at: hoursAfter(liveStart, 4) },
    { wallet_address: wallet, asset: 'JUP', type: 'sell', amount: 2500, price: 0.62, created_at: hoursAfter(liveStart, 32) },
  ]);

  const indexed = await runIndexer(supabase);
  const settled = await settlePastEpochs(supabase);

  const { data: pastScores, error: scoreErr } = await supabase
    .from('epoch_scores')
    .select('*')
    .eq('week_index', pastWeek);
  if (scoreErr) throw scoreErr;

  const allocated = allocateRewards(pastScores || [], getConfig().epochPool);
  const mine = allocated.find((row) => row.wallet_address === wallet);
  const amount = Number(mine?.expected_dbf_reward || 0);
  if (!(amount > 0)) {
    throw new Error(`No eligible past-week loss for ${wallet}`);
  }

  const { error: claimErr } = await supabase.from('claims').upsert(
    {
      week_index: pastWeek,
      wallet_address: wallet,
      amount,
      payout_asset: 'TOKEN',
      status: 'claimable',
      expires_at: claimExpiresAt(pastWeek).toISOString(),
    },
    { onConflict: 'week_index,wallet_address' }
  );
  if (claimErr) throw claimErr;

  return {
    wallet,
    trades: inserted,
    pastWeek,
    currentWeek: current.weekIndex,
    amount,
    indexed,
    settled,
    weekNow: weekIndexAt(),
  };
}
