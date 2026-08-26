/**
 * Split an epoch reward pool across wallets by eligible realized loss.
 * Only wallets with a loss (negative PnL after wash filter) get a share.
 */
export function allocateRewards(scores, pool) {
  const pot = Math.max(0, Number(pool || 0));
  const rows = (scores || []).map((s) => ({
    ...s,
    loss: Math.max(0, -Number(s.eligible_loss ?? s.realized_pnl ?? 0)),
  }));
  const totalLoss = rows.reduce((s, r) => s + r.loss, 0);
  if (pot === 0 || totalLoss === 0) {
    return rows.map((r) => ({ ...r, expected_dbf_reward: 0 }));
  }
  return rows.map((r) => ({
    ...r,
    expected_dbf_reward: (r.loss / totalLoss) * pot,
  }));
}
