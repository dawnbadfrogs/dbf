import { normalizeAddress, verifySolanaMessage } from './solana.js';

export function buildClaimMessage(wallet, weekIndex = 'all') {
  const w = normalizeAddress(wallet);
  return `DBF claim\nwallet:${w}\nweek:${weekIndex}\n`;
}

export async function verifyClaimSignature({ wallet, signature, weekIndex = null }) {
  if (!wallet || !signature) throw new Error('Wallet and signature required');
  const expected = buildClaimMessage(wallet, weekIndex ?? 'all');
  verifySolanaMessage({ wallet, message: expected, signature });
  return true;
}
