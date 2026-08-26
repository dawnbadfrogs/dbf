import { SOL_MINT, isQuoteMint, symbolForMint } from './mints.js';

function uiAmount(raw, decimals) {
  const d = Number(decimals || 0);
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return n / 10 ** d;
}

/**
 * Turn a wallet's token/SOL deltas in one tx into DBF fill rows.
 * Quote legs (SOL/USDC/USDT) are the price source; the other mint is the asset.
 */
export function fillsFromDeltas({
  wallet,
  signature,
  timestamp,
  tokenDeltas,
  solDelta,
  solUsd,
}) {
  const ts = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
  const tokens = (tokenDeltas || []).filter((d) => Math.abs(Number(d.amount || 0)) > 1e-12);
  const sol = Number(solDelta || 0);
  const pxSol = Number(solUsd || 0);

  const gained = tokens.filter((d) => d.amount > 0);
  const lost = tokens.filter((d) => d.amount < 0);

  const rows = [];
  const push = (mint, type, amount, priceUsd) => {
    const amt = Math.abs(Number(amount));
    const price = Number(priceUsd);
    if (!(amt > 0) || !(price > 0) || !Number.isFinite(price)) return;
    const mintAddr = mint === 'SOL' ? SOL_MINT : mint;
    rows.push({
      wallet_address: wallet,
      asset: symbolForMint(mintAddr),
      mint: mintAddr || null,
      type,
      amount: amt,
      price,
      created_at: ts,
      tx_hash: signature,
    });
  };

  const usdFromSol = (solAmount) => Math.abs(solAmount) * pxSol;

  // Token <-> SOL
  if (gained.length === 1 && lost.length === 0 && sol < -0.001 && pxSol > 0) {
    const t = gained[0];
    push(t.mint, 'buy', t.amount, usdFromSol(sol) / t.amount);
    return rows;
  }
  if (lost.length === 1 && gained.length === 0 && sol > 0.001 && pxSol > 0) {
    const t = lost[0];
    push(t.mint, 'sell', t.amount, usdFromSol(sol) / Math.abs(t.amount));
    return rows;
  }

  // Token <-> token (use quote mint as notional if present)
  if (gained.length === 1 && lost.length === 1) {
    const buy = gained[0];
    const sell = lost[0];
    const buyQuote = isQuoteMint(buy.mint);
    const sellQuote = isQuoteMint(sell.mint);
    if (sellQuote && !buyQuote) {
      const notional = quoteUsd(sell, pxSol);
      push(buy.mint, 'buy', buy.amount, notional / buy.amount);
      return rows;
    }
    if (buyQuote && !sellQuote) {
      const notional = quoteUsd(buy, pxSol);
      push(sell.mint, 'sell', sell.amount, notional / Math.abs(sell.amount));
      return rows;
    }
  }

  // SOL quoted as the asset (SOL/USDC)
  if (!tokens.length && Math.abs(sol) > 0.01 && pxSol > 0) {
    push('SOL', sol > 0 ? 'buy' : 'sell', sol, pxSol);
  }

  return rows;
}

function quoteUsd(delta, solUsd) {
  const amt = Math.abs(Number(delta.amount || 0));
  if (delta.mint === SOL_MINT) return amt * Number(solUsd || 0);
  // USDC/USDT ~ $1
  return amt;
}

export function deltasFromParsedTx(tx, wallet) {
  if (!tx || tx.meta?.err) return null;
  const keys = (tx.transaction?.message?.accountKeys || []).map((k) =>
    typeof k === 'string' ? k : k.pubkey
  );
  const idx = keys.findIndex((k) => k === wallet);
  const pre = tx.meta?.preBalances || [];
  const post = tx.meta?.postBalances || [];
  const fee = idx === 0 || keys[idx] === tx.transaction?.message?.accountKeys?.[0]?.pubkey
    ? Number(tx.meta?.fee || 0)
    : 0;
  let solDelta = 0;
  if (idx >= 0) {
    solDelta = (Number(post[idx] || 0) - Number(pre[idx] || 0) + (idx === 0 ? fee : 0)) / 1e9;
  }

  const preTok = new Map();
  for (const b of tx.meta?.preTokenBalances || []) {
    if (b.owner !== wallet) continue;
    preTok.set(b.mint, uiAmount(b.uiTokenAmount?.amount, b.uiTokenAmount?.decimals));
  }
  const tokenDeltas = [];
  const seen = new Set();
  for (const b of tx.meta?.postTokenBalances || []) {
    if (b.owner !== wallet) continue;
    seen.add(b.mint);
    const after = uiAmount(b.uiTokenAmount?.amount, b.uiTokenAmount?.decimals);
    const before = preTok.get(b.mint) || 0;
    const amount = after - before;
    if (Math.abs(amount) > 1e-12) tokenDeltas.push({ mint: b.mint, amount });
  }
  for (const [mint, before] of preTok) {
    if (seen.has(mint)) continue;
    if (Math.abs(before) > 1e-12) tokenDeltas.push({ mint, amount: -before });
  }

  const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();
  const signature =
    tx.transaction?.signatures?.[0] ||
    (Array.isArray(tx.transaction?.signatures) ? tx.transaction.signatures[0] : null);

  return { tokenDeltas, solDelta, timestamp: blockTime, signature };
}

export function fillsFromHeliusTx(tx, wallet, solUsd = 0) {
  if (!tx || tx.transactionError) return [];
  const ts = tx.timestamp ? new Date(tx.timestamp * 1000) : new Date();
  const signature = tx.signature;
  const swap = tx.events?.swap;
  const tokenDeltas = [];
  let solDelta = 0;

  if (swap) {
    const nativeIn = Number(swap.nativeInput?.amount || 0) / 1e9;
    const nativeOut = Number(swap.nativeOutput?.amount || 0) / 1e9;
    if (swap.nativeInput?.account === wallet) solDelta -= nativeIn;
    if (swap.nativeOutput?.account === wallet) solDelta += nativeOut;
    for (const t of swap.tokenInputs || []) {
      if (t.userAccount !== wallet && t.fromUserAccount !== wallet) continue;
      const amt = Number(t.rawTokenAmount?.tokenAmount || t.tokenAmount || 0);
      const dec = Number(t.rawTokenAmount?.decimals ?? t.decimals ?? 0);
      tokenDeltas.push({ mint: t.mint, amount: -uiAmount(amt, dec) || -Number(t.tokenAmount || 0) });
    }
    for (const t of swap.tokenOutputs || []) {
      if (t.userAccount !== wallet && t.toUserAccount !== wallet) continue;
      const amt = Number(t.rawTokenAmount?.tokenAmount || t.tokenAmount || 0);
      const dec = Number(t.rawTokenAmount?.decimals ?? t.decimals ?? 0);
      tokenDeltas.push({ mint: t.mint, amount: uiAmount(amt, dec) || Number(t.tokenAmount || 0) });
    }
  } else {
    for (const t of tx.nativeTransfers || []) {
      if (t.fromUserAccount === wallet) solDelta -= Number(t.amount || 0) / 1e9;
      if (t.toUserAccount === wallet) solDelta += Number(t.amount || 0) / 1e9;
    }
    for (const t of tx.tokenTransfers || []) {
      const amt = Number(t.tokenAmount || 0);
      if (t.fromUserAccount === wallet) tokenDeltas.push({ mint: t.mint, amount: -amt });
      if (t.toUserAccount === wallet) tokenDeltas.push({ mint: t.mint, amount: amt });
    }
  }

  return fillsFromDeltas({
    wallet,
    signature,
    timestamp: ts,
    tokenDeltas,
    solDelta,
    solUsd,
  });
}
