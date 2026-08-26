import { WASH_MS, weekIndexAt } from './epoch.js';

function bucketFor(trade) {
  return String(trade.asset || trade.token || '_default').toUpperCase();
}

function tradeTime(trade) {
  const raw = trade.created_at || trade.at || Date.now();
  const t = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

/**
 * FIFO lots. Realized PnL only counts when the sold lot was held longer than
 * the wash window. Same-wallet round trips inside 24h are excluded from rank.
 */
export function replayTrades(trades, { washMs = WASH_MS } = {}) {
  const books = {};
  const realizations = [];
  let realizedPnL = 0;
  let washPnL = 0;

  for (const trade of trades || []) {
    const key = bucketFor(trade);
    if (!books[key]) books[key] = { lots: [] };
    const amount = Number(trade.amount || 0);
    const price = Number(trade.price || 0);
    if (!(amount > 0) || !Number.isFinite(price)) continue;
    const at = tradeTime(trade);
    const week = weekIndexAt(at);

    if (trade.type === 'buy') {
      books[key].lots.push({ amount, unitCost: price, acquiredAt: at });
      continue;
    }
    if (trade.type !== 'sell') continue;

    let remaining = amount;
    let sellRealized = 0;
    let sellWash = 0;
    const lots = books[key].lots;

    while (remaining > 0 && lots.length) {
      const lot = lots[0];
      const sold = Math.min(remaining, lot.amount);
      const pnl = sold * (price - lot.unitCost);
      const wash = at - lot.acquiredAt < washMs;
      if (wash) {
        washPnL += pnl;
        sellWash += pnl;
      } else {
        realizedPnL += pnl;
        sellRealized += pnl;
      }
      lot.amount -= sold;
      remaining -= sold;
      if (lot.amount <= 1e-12) lots.shift();
    }

    realizations.push({
      wallet: String(trade.wallet_address || '').trim(),
      asset: key,
      at,
      week,
      realized: sellRealized,
      wash: sellWash,
      washTrade: Math.abs(sellWash) > 0 && Math.abs(sellRealized) < 1e-12,
    });
  }

  const positions = Object.entries(books)
    .map(([asset, book]) => {
      const amount = book.lots.reduce((s, l) => s + l.amount, 0);
      const costTotal = book.lots.reduce((s, l) => s + l.amount * l.unitCost, 0);
      const cost = amount > 0 ? costTotal / amount : 0;
      return { asset, amount, cost, lots: book.lots };
    })
    .filter((p) => p.amount > 1e-12);

  return { books, positions, realizedPnL, washPnL, realizations };
}

export const calculateRealizedPnL = (trades) => replayTrades(trades).realizedPnL;

export function summarizeTrades(trades, marks = {}) {
  const { positions, realizedPnL, washPnL } = replayTrades(trades);
  const mapped = positions.map((p) => {
    const mark = Number(marks[p.asset] ?? p.cost);
    const size = p.amount * mark;
    return {
      asset: p.asset,
      side: 'Long',
      amount: p.amount,
      size,
      cost: p.cost,
      pnl: (mark - p.cost) * p.amount,
    };
  });
  return {
    positions: mapped,
    openValue: mapped.reduce((s, p) => s + p.size, 0),
    unrealized: mapped.reduce((s, p) => s + p.pnl, 0),
    realizedPnL,
    washPnL,
  };
}

/** Loss eligible for Rekt to Earn: negative realized PnL after wash filter. */
export function eligibleLoss(realizedPnL) {
  const n = Number(realizedPnL || 0);
  return n < 0 ? n : 0;
}
