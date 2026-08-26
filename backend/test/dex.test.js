import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fillsFromDeltas, fillsFromHeliusTx } from '../src/dex/parse.js';
import { SOL_MINT } from '../src/dex/mints.js';
import { sanitizeTicker } from '../src/dex/symbols.js';

const WALLET = 'FsgEjZLqMVZsH8SdVU7tx9pVduwdVqa7UnwBgp4BaWgh';
const BONK = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

describe('dex fills', () => {
  it('maps SOL out + token in to a buy', () => {
    const rows = fillsFromDeltas({
      wallet: WALLET,
      signature: 'sigBuy',
      timestamp: '2026-08-20T00:00:00.000Z',
      tokenDeltas: [{ mint: BONK, amount: 1000 }],
      solDelta: -2,
      solUsd: 150,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'buy');
    assert.equal(rows[0].asset, 'BONK');
    assert.equal(rows[0].mint, BONK);
    assert.equal(rows[0].amount, 1000);
    assert.equal(rows[0].price, 0.3);
  });

  it('maps token out + SOL in to a sell', () => {
    const rows = fillsFromDeltas({
      wallet: WALLET,
      signature: 'sigSell',
      timestamp: '2026-08-21T00:00:00.000Z',
      tokenDeltas: [{ mint: BONK, amount: -1000 }],
      solDelta: 1,
      solUsd: 150,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'sell');
    assert.equal(rows[0].price, 0.15);
  });

  it('parses a Helius swap event', () => {
    const rows = fillsFromHeliusTx(
      {
        signature: 'helius1',
        timestamp: 1755734400,
        events: {
          swap: {
            nativeInput: { account: WALLET, amount: 2e9 },
            tokenOutputs: [
              {
                userAccount: WALLET,
                mint: BONK,
                rawTokenAmount: { tokenAmount: '1000', decimals: 0 },
              },
            ],
          },
        },
      },
      WALLET,
      150
    );
    assert.equal(rows[0]?.type, 'buy');
    assert.equal(rows[0]?.asset, 'BONK');
    assert.equal(rows[0]?.price, 0.3);
  });

  it('ignores quote-only noise without a price', () => {
    const rows = fillsFromDeltas({
      wallet: WALLET,
      signature: 'dust',
      timestamp: '2026-08-20T00:00:00.000Z',
      tokenDeltas: [],
      solDelta: -0.000005,
      solUsd: 150,
    });
    assert.equal(rows.length, 0);
  });

  it('does not treat SOL mint as the ranked asset when swapping for BONK', () => {
    const rows = fillsFromDeltas({
      wallet: WALLET,
      signature: 'pair',
      timestamp: '2026-08-20T00:00:00.000Z',
      tokenDeltas: [
        { mint: SOL_MINT, amount: -2 },
        { mint: BONK, amount: 500 },
      ],
      solDelta: 0,
      solUsd: 150,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].asset, 'BONK');
    assert.equal(rows[0].mint, BONK);
    assert.equal(rows[0].type, 'buy');
  });
});

describe('tickers', () => {
  it('sanitizes DexScreener-style symbols', () => {
    assert.equal(sanitizeTicker('$bonk'), 'BONK');
    assert.equal(sanitizeTicker('wif-sol'), 'WIFSOL');
    assert.equal(sanitizeTicker('x'), null);
    assert.equal(sanitizeTicker('this-is-way-too-long-for-a-ticker'), null);
  });
});
