import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { replayTrades, eligibleLoss } from '../src/engine/pnl.js';
import { allocateRewards } from '../src/engine/rewards.js';
import { weekIndexAt, GENESIS_UTC } from '../src/engine/epoch.js';

describe('fifo pnl + wash', () => {
  it('realizes a held loss after 24h', () => {
    const t0 = Date.parse('2026-08-10T02:00:00Z');
    const t1 = t0 + 36 * 3600 * 1000;
    const out = replayTrades([
      { type: 'buy', asset: 'SOL', amount: 10, price: 40, created_at: t0 },
      { type: 'sell', asset: 'SOL', amount: 10, price: 10, created_at: t1 },
    ]);
    assert.equal(out.realizedPnL, -300);
    assert.equal(out.washPnL, 0);
    assert.equal(eligibleLoss(out.realizedPnL), -300);
  });

  it('excludes same-day round trip from rank', () => {
    const t0 = Date.parse('2026-08-10T02:00:00Z');
    const t1 = t0 + 2 * 3600 * 1000;
    const out = replayTrades([
      { type: 'buy', asset: 'SOL', amount: 10, price: 40, created_at: t0 },
      { type: 'sell', asset: 'SOL', amount: 10, price: 10, created_at: t1 },
    ]);
    assert.equal(out.realizedPnL, 0);
    assert.equal(out.washPnL, -300);
    assert.equal(eligibleLoss(out.realizedPnL), 0);
  });
});

describe('rewards', () => {
  it('splits pool by eligible loss', () => {
    const rows = allocateRewards(
      [
        { wallet_address: 'a', eligible_loss: -200 },
        { wallet_address: 'b', eligible_loss: -100 },
        { wallet_address: 'c', eligible_loss: 50 },
      ],
      3000
    );
    assert.equal(rows[0].expected_dbf_reward, 2000);
    assert.equal(rows[1].expected_dbf_reward, 1000);
    assert.equal(rows[2].expected_dbf_reward, 0);
  });
});

describe('epoch', () => {
  it('genesis week is 1', () => {
    assert.equal(weekIndexAt(new Date(GENESIS_UTC + 1000)), 1);
  });

  it('26 Aug 2026 is still week 1', () => {
    assert.equal(weekIndexAt(new Date('2026-08-26T04:00:00Z')), 1);
  });

  it('trades before genesis are not ranked', () => {
    assert.equal(weekIndexAt(new Date('2026-08-17T12:00:00Z')), 0);
  });
});
