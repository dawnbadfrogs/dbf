/** Common quote mints — the other side of the swap is the ranked asset. */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const WSOL_MINT = SOL_MINT;

export const QUOTE_MINTS = new Set([
  SOL_MINT,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'USD1ttGY1N17NEEHLmELoghtiyF1EaMp6V4zWcFGa2V',
]);

export const MINT_SYMBOL = {
  [SOL_MINT]: 'SOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 'BONK',
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 'JUP',
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: 'WIF',
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT',
  'FXsLk1A1tzMLHTU4TwD888wrwt4ohdFTzReSRtMepump': 'DBF',
};

export function isQuoteMint(mint) {
  return QUOTE_MINTS.has(String(mint || ''));
}

export function symbolForMint(mint) {
  const m = String(mint || '');
  if (MINT_SYMBOL[m]) return MINT_SYMBOL[m];
  if (m === SOL_MINT) return 'SOL';
  return m.slice(0, 4).toUpperCase();
}
