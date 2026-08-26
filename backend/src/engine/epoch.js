/** Weekly epoch: Monday 00:00 UTC → next Monday. Genesis = Mon 24 Aug 2026 (public week 1). */
export const GENESIS_UTC = Date.UTC(2026, 7, 24);
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const CLAIM_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const WASH_MS = 24 * 60 * 60 * 1000;

export function epochStartUtc(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const d = new Date(t);
  const diffToMonday = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday);
}

export function weekIndexAt(at = new Date()) {
  const start = epochStartUtc(at);
  if (start < GENESIS_UTC) return 0;
  return Math.floor((start - GENESIS_UTC) / WEEK_MS) + 1;
}

export function epochBounds(weekIndex) {
  const starts = GENESIS_UTC + (weekIndex - 1) * WEEK_MS;
  const ends = starts + WEEK_MS;
  return { starts_at: new Date(starts), ends_at: new Date(ends) };
}

export function getCurrentEpoch(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const start = epochStartUtc(t);
  const end = start + WEEK_MS;
  const elapsed = Math.max(0, t - start);
  const progress = Math.max(0, Math.min(100, (elapsed / WEEK_MS) * 100));
  const weekIndex = weekIndexAt(t);
  return {
    start: new Date(start),
    end: new Date(end),
    progress,
    daysLeft: Math.max(0, Math.ceil((end - t) / (24 * 60 * 60 * 1000))),
    weekIndex,
    hoursIntoEpoch: elapsed / (60 * 60 * 1000),
    hoursLeft: Math.max(0, (end - t) / (60 * 60 * 1000)),
    label: `Epoch week ${weekIndex}`,
    rangeLabel: 'Mon 00:00 UTC → next Mon',
  };
}

export function claimExpiresAt(weekIndex) {
  return new Date(epochBounds(weekIndex).ends_at.getTime() + CLAIM_WINDOW_MS);
}
