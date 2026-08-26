/**
 * Weighted-average FIFO PnL, per asset.
 * Sells inside 24h of the matching buy are wash and excluded from realized rank.
 * Trade shape: { asset?, type: 'buy'|'sell', amount, price, created_at? }
 */
const WASH_MS = 24 * 60 * 60 * 1000;

function bucketFor(trade) {
  return String(trade.asset || trade.token || '_default').toUpperCase();
}

function tradeTime(trade) {
  const raw = trade.created_at || trade.at;
  if (!raw) return 0;
  const t = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function replayTrades(trades) {
  const books = {};
  let realizedPnL = 0;
  let washPnL = 0;

  for (const trade of trades || []) {
    const key = bucketFor(trade);
    if (!books[key]) books[key] = { lots: [] };
    const amount = Number(trade.amount || 0);
    const price = Number(trade.price || 0);
    if (!(amount > 0) || !Number.isFinite(price)) continue;
    const at = tradeTime(trade);

    if (trade.type === 'buy') {
      books[key].lots.push({ amount, unitCost: price, acquiredAt: at });
      continue;
    }
    if (trade.type !== 'sell') continue;

    let remaining = amount;
    const lots = books[key].lots;
    while (remaining > 0 && lots.length) {
      const lot = lots[0];
      const sold = Math.min(remaining, lot.amount);
      const pnl = sold * (price - lot.unitCost);
      const held = at && lot.acquiredAt ? at - lot.acquiredAt : WASH_MS;
      if (held < WASH_MS) washPnL += pnl;
      else realizedPnL += pnl;
      lot.amount -= sold;
      remaining -= sold;
      if (lot.amount <= 1e-12) lots.shift();
    }
  }

  return { books, realizedPnL, washPnL };
}

export const calculateRealizedPnL = (trades) => replayTrades(trades).realizedPnL;

export const calculateAverageCost = (trades) => {
  const { books } = replayTrades(trades);
  let remaining = 0;
  let cost = 0;
  for (const book of Object.values(books)) {
    for (const lot of book.lots) {
      remaining += lot.amount;
      cost += lot.amount * lot.unitCost;
    }
  }
  return remaining > 0 ? cost / remaining : 0;
};

export function summarizeTrades(trades, marks = {}) {
  const { books, realizedPnL, washPnL } = replayTrades(trades);
  const positions = Object.entries(books)
    .map(([asset, book]) => {
      const amount = book.lots.reduce((s, l) => s + l.amount, 0);
      const costTotal = book.lots.reduce((s, l) => s + l.amount * l.unitCost, 0);
      if (amount <= 1e-12) return null;
      const cost = costTotal / amount;
      const mark = Number(marks[asset] ?? cost);
      return {
        asset,
        side: 'Long',
        amount,
        size: amount * mark,
        cost,
        pnl: (mark - cost) * amount,
      };
    })
    .filter(Boolean);

  return {
    positions,
    openValue: positions.reduce((s, p) => s + p.size, 0),
    unrealized: positions.reduce((s, p) => s + p.pnl, 0),
    realizedPnL,
    washPnL,
  };
}
