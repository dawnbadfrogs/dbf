import { epochBounds, weekIndexAt } from './engine/epoch.js';
import { DEMO_WALLETS as WALLETS } from './demoWallets.js';

function iso(ms) {
  return new Date(ms).toISOString();
}

function hoursAfter(startMs, hours) {
  return startMs + hours * 60 * 60 * 1000;
}

/**
 * Demo fills: real bag dumps for rank, plus one wash round-trip that must
 * not count. Week 1 is in the past so settle can open claims.
 */
export function buildDemoTrades(now = new Date()) {
  const currentWeek = weekIndexAt(now);
  const week1 = Math.max(1, currentWeek - 1);
  const w1 = epochBounds(week1).starts_at.getTime();
  const wNow = epochBounds(currentWeek).starts_at.getTime();
  const trades = [];

  const push = (wallet, asset, type, amount, price, at) => {
    trades.push({
      wallet_address: wallet,
      asset,
      type,
      amount,
      price,
      created_at: iso(at),
    });
  };

  // Week 1: verified dumps (held > 24h)
  push(WALLETS[0], 'SOL', 'buy', 80, 180, hoursAfter(w1, 2));
  push(WALLETS[0], 'SOL', 'sell', 80, 95, hoursAfter(w1, 50));

  push(WALLETS[1], 'BONK', 'buy', 12000000, 0.000028, hoursAfter(w1, 4));
  push(WALLETS[1], 'BONK', 'sell', 12000000, 0.000009, hoursAfter(w1, 40));

  push(WALLETS[2], 'JUP', 'buy', 4000, 1.4, hoursAfter(w1, 6));
  push(WALLETS[2], 'JUP', 'sell', 4000, 0.72, hoursAfter(w1, 55));

  push(WALLETS[3], 'WIF', 'buy', 2200, 2.8, hoursAfter(w1, 8));
  push(WALLETS[3], 'WIF', 'sell', 2200, 0.95, hoursAfter(w1, 36));

  // Wash: buy and dump inside 24h — excluded from rank
  push(WALLETS[4], 'POPCAT', 'buy', 8000, 0.9, hoursAfter(w1, 10));
  push(WALLETS[4], 'POPCAT', 'sell', 8000, 0.22, hoursAfter(w1, 12));

  // Current week live board
  push(WALLETS[0], 'SOL', 'buy', 40, 175, hoursAfter(wNow, 3));
  push(WALLETS[0], 'SOL', 'sell', 40, 110, hoursAfter(wNow, 30));

  push(WALLETS[1], 'BONK', 'buy', 8000000, 0.000026, hoursAfter(wNow, 5));
  push(WALLETS[1], 'BONK', 'sell', 8000000, 0.000011, hoursAfter(wNow, 32));

  push(WALLETS[5], 'JUP', 'buy', 9000, 1.35, hoursAfter(wNow, 4));
  push(WALLETS[5], 'JUP', 'sell', 9000, 0.68, hoursAfter(wNow, 40));

  push(WALLETS[6], 'WIF', 'buy', 1100, 2.4, hoursAfter(wNow, 6));
  push(WALLETS[6], 'WIF', 'sell', 1100, 1.1, hoursAfter(wNow, 31));

  push(WALLETS[7], 'SOL', 'buy', 18, 190, hoursAfter(wNow, 8));
  push(WALLETS[7], 'SOL', 'sell', 9, 140, hoursAfter(wNow, 36));

  // Current-week wash (should not rank)
  push(WALLETS[4], 'BONK', 'buy', 4000000, 0.00003, hoursAfter(wNow, 10));
  push(WALLETS[4], 'BONK', 'sell', 4000000, 0.000008, hoursAfter(wNow, 11));

  return { trades, wallets: WALLETS, week1, currentWeek };
}

export async function seedDemo(supabase) {
  const { trades, wallets, week1, currentWeek } = buildDemoTrades();

  await supabase.from('claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('epoch_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('treasury_flows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('treasury_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('nft_holders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('traders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { error: tradeErr } = await supabase.from('trades').insert(trades);
  if (tradeErr) throw tradeErr;

  const past = epochBounds(week1);
  const live = epochBounds(currentWeek);
  const { error: epochErr } = await supabase.from('epochs').upsert(
    [
      {
        week_index: week1,
        starts_at: past.starts_at.toISOString(),
        ends_at: past.ends_at.toISOString(),
        settled: false,
        reward_pool: 100000,
      },
      {
        week_index: currentWeek,
        starts_at: live.starts_at.toISOString(),
        ends_at: live.ends_at.toISOString(),
        settled: false,
        reward_pool: 100000,
      },
    ],
    { onConflict: 'week_index' }
  );
  if (epochErr) throw epochErr;

  const { error: snapErr } = await supabase.from('treasury_snapshots').insert({
    balance_usd: 184000,
    epoch_in_usd: 12600,
  });
  if (snapErr) throw snapErr;

  const { error: flowErr } = await supabase.from('treasury_flows').insert([
    { label: 'Protocol fees', amount: 8200, type: 'in' },
    { label: 'LP residual', amount: 4400, type: 'in' },
  ]);
  if (flowErr) throw flowErr;

  const collections = [
    {
      id: 'genesis',
      name: 'Bad Frog Genesis',
      supply: '1,111',
      status: 'Live',
      floor: '0.01 SOL',
      accent: '#FE77BC',
    },
  ];
  const { error: colErr } = await supabase
    .from('nft_collections')
    .upsert(collections, { onConflict: 'id' });
  if (colErr) throw colErr;

  const { error: holdErr } = await supabase.from('nft_holders').insert([
    { wallet_address: wallets[0], collection_id: 'genesis' },
  ]);
  if (holdErr) throw holdErr;

  return { trades: trades.length, wallets: wallets.length, week1, currentWeek };
}
