/** Weekly epoch: Monday 00:00 UTC → next Monday. Genesis = Mon 24 Aug 2026 (public week 1). */
const GENESIS_UTC = Date.UTC(2026, 7, 24);

export function getCurrentEpoch(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const d = new Date(t);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday)
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const elapsed = Math.max(0, t - start.getTime());
  const duration = end.getTime() - start.getTime();
  const progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - t) / (24 * 60 * 60 * 1000)));
  const weekIndex =
    start.getTime() < GENESIS_UTC
      ? 0
      : Math.floor((start.getTime() - GENESIS_UTC) / duration) + 1;
  const hoursIntoEpoch = elapsed / (60 * 60 * 1000);
  const hoursLeft = Math.max(0, (end.getTime() - t) / (60 * 60 * 1000));

  return {
    start,
    end,
    progress,
    daysLeft,
    weekIndex,
    hoursIntoEpoch,
    hoursLeft,
    label: `Epoch week ${weekIndex}`,
    rangeLabel: 'Mon 00:00 UTC → next Mon',
  };
}

export function epochCheckpoints(epoch, { hasVerifiedLoss = false } = {}) {
  return [
    { label: 'Epoch open', done: true },
    { label: 'Losses verified', done: hasVerifiedLoss || epoch.hoursIntoEpoch > 12 },
    { label: 'Rank snapshot', done: epoch.hoursLeft <= 12 },
    { label: 'Reward payout', done: epoch.progress >= 100 },
  ];
}
