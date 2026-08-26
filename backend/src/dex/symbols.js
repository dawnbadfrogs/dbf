import { MINT_SYMBOL, SOL_MINT } from './mints.js';

const cache = new Map();

export function sanitizeTicker(raw) {
  const cleaned = String(raw || '')
    .replace(/^\$/, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 2 && cleaned.length <= 12) return cleaned;
  return null;
}

async function fetchJson(url, timeoutMs = 8000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickDexTicker(pairs, mint) {
  const want = String(mint || '');
  const matches = (Array.isArray(pairs) ? pairs : []).filter((p) => {
    const base = p?.baseToken?.address;
    const quote = p?.quoteToken?.address;
    return base === want || quote === want;
  });
  matches.sort(
    (a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0)
  );
  const best = matches[0];
  if (!best) return null;
  const token = best.baseToken?.address === want ? best.baseToken : best.quoteToken;
  return sanitizeTicker(token?.symbol);
}

async function fromDexScreener(mints) {
  const found = new Map();
  const chunkSize = 30;
  for (let i = 0; i < mints.length; i += chunkSize) {
    const chunk = mints.slice(i, i + chunkSize);
    const body = await fetchJson(
      `https://api.dexscreener.com/tokens/v1/solana/${chunk.join(',')}`
    );
    for (const mint of chunk) {
      const ticker = pickDexTicker(body, mint);
      if (ticker) found.set(mint, ticker);
    }
  }
  return found;
}

async function fromJupiter(mint) {
  const body = await fetchJson(
    `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(mint)}`
  );
  const hit = (Array.isArray(body) ? body : []).find((t) => t?.id === mint);
  return sanitizeTicker(hit?.symbol);
}

export async function resolveSymbols(mints) {
  const unique = [...new Set((mints || []).map(String).filter(Boolean))];
  const out = new Map();
  const need = [];

  for (const mint of unique) {
    if (mint === SOL_MINT || MINT_SYMBOL[mint]) {
      const ticker = MINT_SYMBOL[mint] || 'SOL';
      out.set(mint, ticker);
      continue;
    }
    if (cache.has(mint)) {
      out.set(mint, cache.get(mint));
      continue;
    }
    need.push(mint);
  }

  if (need.length) {
    const dex = await fromDexScreener(need);
    const leftover = [];
    for (const mint of need) {
      const ticker = dex.get(mint);
      if (ticker) {
        cache.set(mint, ticker);
        out.set(mint, ticker);
      } else {
        leftover.push(mint);
      }
    }
    for (const mint of leftover) {
      const ticker = await fromJupiter(mint);
      if (ticker) {
        cache.set(mint, ticker);
        out.set(mint, ticker);
      }
    }
  }

  return out;
}

export async function attachTickers(fills) {
  const mints = (fills || []).map((f) => f.mint).filter(Boolean);
  const map = await resolveSymbols(mints);
  return (fills || []).map((row) => {
    const { mint, ...rest } = row;
    const ticker = (mint && map.get(mint)) || rest.asset;
    return { ...rest, asset: String(ticker || rest.asset || '').toUpperCase() };
  });
}
