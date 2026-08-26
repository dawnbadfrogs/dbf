import { DEMO_WALLETS } from './demoWallets.js';

const NIL = '00000000-0000-0000-0000-000000000000';

/** Strip seed wallets and fake treasury rows so the public board is live-only. */
export async function purgeDemo(supabase) {
  const tables = ['claims', 'epoch_scores', 'positions', 'trades', 'traders', 'nft_holders'];
  const deleted = {};
  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in('wallet_address', DEMO_WALLETS);
    if (error) throw error;
    deleted[table] = count ?? 0;
  }
  const { error: flowErr, count: flows } = await supabase
    .from('treasury_flows')
    .delete({ count: 'exact' })
    .neq('id', NIL);
  if (flowErr) throw flowErr;
  const { error: snapErr, count: snaps } = await supabase
    .from('treasury_snapshots')
    .delete({ count: 'exact' })
    .neq('id', NIL);
  if (snapErr) throw snapErr;
  deleted.treasury_flows = flows ?? 0;
  deleted.treasury_snapshots = snaps ?? 0;
  return deleted;
}
