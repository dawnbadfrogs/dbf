import { SOL_MINT } from './mints.js';

let cache = { at: 0, solUsd: 0 };

export async function getSolUsd() {
  if (Date.now() - cache.at < 60_000 && cache.solUsd > 0) return cache.solUsd;
  const urls = [
    `https://lite-api.jup.ag/price/v2?ids=${SOL_MINT}`,
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) continue;
      const body = await res.json();
      const jup = Number(body?.data?.[SOL_MINT]?.price);
      const cg = Number(body?.solana?.usd);
      const px = jup > 0 ? jup : cg;
      if (px > 0) {
        cache = { at: Date.now(), solUsd: px };
        return px;
      }
    } catch {
      /* try next */
    }
  }
  return cache.solUsd || 150;
}
