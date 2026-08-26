import { replayTrades, eligibleLoss } from './engine/pnl.js';
import { allocateRewards } from './engine/rewards.js';
import { epochBounds, getCurrentEpoch } from './engine/epoch.js';
import { getConfig } from './db.js';
import { DEMO_WALLETS } from './demoWallets.js';
import { normalizeAddress } from './solana.js';

const DEMO = new Set(DEMO_WALLETS);

function norm(addr) {
  return normalizeAddress(addr);
}

export async function runIndexer(supabase, { pool } = {}) {
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const list = trades || [];
  const byWallet = new Map();
  for (const trade of list) {
    const wallet = norm(trade.wallet_address);
    if (!wallet || DEMO.has(wallet)) continue;
    if (!byWallet.has(wallet)) byWallet.set(wallet, []);
    byWallet.get(wallet).push({ ...trade, wallet_address: wallet });
  }

  const current = getCurrentEpoch();
  const scoreMap = new Map();
  const positions = [];
  const tradePatches = [];

  for (const [wallet, walletTrades] of byWallet) {
    const replayed = replayTrades(walletTrades);
    for (const pos of replayed.positions) {
      positions.push({
        wallet_address: wallet,
        asset: pos.asset,
        side: 'Long',
        size_usd: pos.amount * pos.cost,
        cost_basis: pos.cost,
        unrealized_pnl: 0,
        updated_at: new Date().toISOString(),
      });
    }

    const byWeek = new Map();
    for (const r of replayed.realizations) {
      if (!byWeek.has(r.week)) byWeek.set(r.week, { realized: 0, wash: 0 });
      const row = byWeek.get(r.week);
      row.realized += r.realized;
      row.wash += r.wash;
    }
    // Wallets with buys but no sells still need a current-week row of 0
    if (!byWeek.has(current.weekIndex)) {
      byWeek.set(current.weekIndex, { realized: 0, wash: 0 });
    }
    for (const [week, pnl] of byWeek) {
      scoreMap.set(`${week}:${wallet}`, {
        week_index: week,
        wallet_address: wallet,
        realized_pnl: pnl.realized,
        wash_pnl: pnl.wash,
        eligible_loss: eligibleLoss(pnl.realized),
        expected_dbf_reward: 0,
      });
    }

    const sells = walletTrades.filter((t) => t.type === 'sell');
    replayed.realizations.forEach((match, i) => {
      const trade = sells[i];
      if (!trade?.id) return;
      tradePatches.push({
        id: trade.id,
        wash: Boolean(match.washTrade),
        realized_pnl: match.realized,
        epoch_week: match.week,
      });
    });
  }

  const weeks = new Set([...scoreMap.values()].map((s) => s.week_index));
  weeks.add(current.weekIndex);
  const epochRows = [...weeks].map((week) => {
    const { starts_at, ends_at } = epochBounds(week);
    return {
      week_index: week,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
    };
  });

  const rewardPool = pool ?? getConfig().epochPool;
  const currentScores = [...scoreMap.values()].filter((s) => s.week_index === current.weekIndex);
  const allocated = allocateRewards(currentScores, rewardPool);
  for (const row of allocated) {
    const key = `${row.week_index}:${row.wallet_address}`;
    if (scoreMap.has(key)) scoreMap.get(key).expected_dbf_reward = row.expected_dbf_reward;
  }

  const scoreRows = [...scoreMap.values()];
  const traderRows = allocated.map((row) => ({
    wallet_address: row.wallet_address,
    total_loss: row.eligible_loss,
    expected_dbf_reward: row.expected_dbf_reward,
  }));

  if (epochRows.length) {
    const { error: epochErr } = await supabase
      .from('epochs')
      .upsert(epochRows, { onConflict: 'week_index' });
    if (epochErr) throw epochErr;
  }

  if (scoreRows.length) {
    const { error: scoreErr } = await supabase
      .from('epoch_scores')
      .upsert(scoreRows, { onConflict: 'week_index,wallet_address' });
    if (scoreErr) throw scoreErr;
  }

  if (traderRows.length) {
    const { error: traderErr } = await supabase
      .from('traders')
      .upsert(traderRows, { onConflict: 'wallet_address' });
    if (traderErr) throw traderErr;
  }

  const liveWallets = new Set(traderRows.map((r) => r.wallet_address));
  const { data: existingTraders } = await supabase.from('traders').select('wallet_address');
  const stale = (existingTraders || [])
    .map((r) => r.wallet_address)
    .filter((w) => DEMO.has(w) || !liveWallets.has(norm(w)));
  if (stale.length) {
    await supabase.from('traders').delete().in('wallet_address', stale);
  }

  if (positions.length) {
    const { error: delPos } = await supabase.from('positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delPos) throw delPos;
    const { error: posErr } = await supabase.from('positions').insert(positions);
    if (posErr) throw posErr;
  }

  for (const patch of tradePatches) {
    const { error: patchErr } = await supabase
      .from('trades')
      .update({
        wash: patch.wash,
        realized_pnl: patch.realized_pnl,
        epoch_week: patch.epoch_week,
      })
      .eq('id', patch.id);
    if (patchErr) throw patchErr;
  }

  await supabase.from('indexer_state').upsert({
    key: 'last_index',
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return {
    wallets: byWallet.size,
    trades: list.length,
    scores: scoreRows.length,
    week: current.weekIndex,
  };
}
