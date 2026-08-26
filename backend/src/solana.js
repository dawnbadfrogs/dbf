import nacl from 'tweetnacl';
import bs58 from 'bs58';

/** Solana base58 pubkey (32 bytes). Case-sensitive — never lowercase. */
export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function normalizeAddress(address) {
  return String(address || '').trim();
}

export function isSolanaAddress(address) {
  const a = normalizeAddress(address);
  if (!SOLANA_ADDRESS_RE.test(a)) return false;
  try {
    return bs58.decode(a).length === 32;
  } catch {
    return false;
  }
}

function decodeSignature(signature) {
  const raw = String(signature || '').trim();
  if (!raw) throw new Error('Missing signature');
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === 128) {
    return Buffer.from(raw, 'hex');
  }
  if (raw.startsWith('0x') && raw.length === 130) {
    return Buffer.from(raw.slice(2), 'hex');
  }
  try {
    const b58 = bs58.decode(raw);
    if (b58.length === 64) return Buffer.from(b58);
  } catch {
    /* try base64 next */
  }
  const b64 = Buffer.from(raw, 'base64');
  if (b64.length === 64) return b64;
  throw new Error('Invalid Solana signature');
}

export function verifySolanaMessage({ wallet, message, signature }) {
  const pubkey = normalizeAddress(wallet);
  if (!isSolanaAddress(pubkey)) throw new Error('Invalid Solana wallet');
  const sig = decodeSignature(signature);
  const msg = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const ok = nacl.sign.detached.verify(msg, new Uint8Array(sig), bs58.decode(pubkey));
  if (!ok) throw new Error('Invalid claim signature');
  return true;
}
