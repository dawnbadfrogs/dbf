import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { buildClaimMessage, verifyClaimSignature } from '../src/auth.js';

function keypair() {
  const kp = nacl.sign.keyPair();
  return { secret: kp.secretKey, wallet: bs58.encode(kp.publicKey) };
}

describe('claim auth', () => {
  it('verifies Solana signMessage for claim message', async () => {
    const { secret, wallet } = keypair();
    const message = buildClaimMessage(wallet, 'all');
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), secret));
    await verifyClaimSignature({ wallet, signature, weekIndex: null });
    assert.ok(true);
  });

  it('rejects bad signature', async () => {
    const { wallet } = keypair();
    await assert.rejects(() =>
      verifyClaimSignature({
        wallet,
        signature: bs58.encode(new Uint8Array(64)),
        weekIndex: null,
      })
    );
  });
});
