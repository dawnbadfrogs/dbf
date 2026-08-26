import { allocateRewards } from './engine/rewards.js';
import { claimExpiresAt, getCurrentEpoch } from './engine/epoch.js';
import { getConfig } from './db.js';
import { isSolanaAddress, normalizeAddress } from './solana.js';

function norm(addr) {
  return normalizeAddress(addr);
}

export async function expireClaims(supabase, now = new Date()) {
  const { data: expired, error } = await supabase
    .from('claims')
    .select('id, week_index, amount')
    .eq('status', 'claimable')
    .lt('expires_at', now.toISOString());
  if (error) throw error;
  if (!expired?.length) return { expired: 0, returned: 0 };

  const { error: updErr } = await supabase
    .from('claims')
    .update({ status: 'expired' })
    .in(
      'id',
      expired.map((c) => c.id)
    );
  if (updErr) throw updErr;

  const returned = expired.reduce((s, c) => s + Number(c.amount || 0), 0);
  if (returned > 0) {
    const { error: flowErr } = await supabase.from('treasury_flows').insert({
      label: `Unclaimed rewards returned (${expired.length} wallets)`,
      amount: returned,
      type: 'in',
    });
    if (flowErr) throw flowErr;
  }
  return { expired: expired.length, returned };
}

export async function settlePastEpochs(supabase, { pool } = {}) {
  const now = new Date();
  const current = getCurrentEpoch(now);
  const rewardPool = pool ?? getConfig().epochPool;

  const { data: epochs, error } = await supabase
    .from('epochs')
    .select('*')
    .eq('settled', false)
    .lt('ends_at', now.toISOString());
  if (error) throw error;

  const settled = [];
  for (const epoch of epochs || []) {
    if (epoch.week_index >= current.weekIndex) continue;
    const { data: scores, error: scoreErr } = await supabase
      .from('epoch_scores')
      .select('*')
      .eq('week_index', epoch.week_index);
    if (scoreErr) throw scoreErr;

    const allocated = allocateRewards(scores || [], rewardPool).filter(
      (r) => r.expected_dbf_reward > 0
    );
    const expiresAt = claimExpiresAt(epoch.week_index).toISOString();
    if (allocated.length) {
      const claims = allocated.map((row) => ({
        week_index: epoch.week_index,
        wallet_address: norm(row.wallet_address),
        amount: row.expected_dbf_reward,
        payout_asset: 'TOKEN',
        status: 'claimable',
        expires_at: expiresAt,
      }));
      const { error: claimErr } = await supabase
        .from('claims')
        .upsert(claims, { onConflict: 'week_index,wallet_address' });
      if (claimErr) throw claimErr;
    }

    const { error: epochErr } = await supabase
      .from('epochs')
      .update({
        settled: true,
        reward_pool: rewardPool,
        settled_at: now.toISOString(),
      })
      .eq('week_index', epoch.week_index);
    if (epochErr) throw epochErr;

    if (allocated.length) {
      const paid = allocated.reduce((s, r) => s + r.expected_dbf_reward, 0);
      await supabase.from('treasury_flows').insert({
        label: `Epoch ${epoch.week_index} reward pool`,
        amount: paid,
        type: 'out',
      });
    }
    settled.push(epoch.week_index);
  }

  const expired = await expireClaims(supabase, now);
  return { settled, ...expired, currentWeek: current.weekIndex };
}

export async function claimRewards(supabase, walletAddress, weekIndex = null) {
  const wallet = norm(walletAddress);
  if (!isSolanaAddress(wallet)) {
    throw new Error('Invalid Solana wallet');
  }
  await expireClaims(supabase);

  let query = supabase
    .from('claims')
    .select('*')
    .eq('wallet_address', wallet)
    .eq('status', 'claimable');
  if (weekIndex != null) query = query.eq('week_index', Number(weekIndex));

  const { data: rows, error } = await query;
  if (error) throw error;
  if (!rows?.length) return { claimed: 0, amount: 0, ids: [] };

  const ids = rows.map((r) => r.id);
  const amount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const { error: updErr } = await supabase
    .from('claims')
    .update({ status: 'claimed', claimed_at: new Date().toISOString() })
    .in('id', ids);
  if (updErr) throw updErr;

  return { claimed: rows.length, amount, ids, weeks: rows.map((r) => r.week_index) };
}
