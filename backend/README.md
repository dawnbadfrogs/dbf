# DBF backend

Indexer, epoch settle, claim API, and Solana trade ingest. Frontend reads Supabase with anon key; this process writes with the service role.

Wallets are **Solana base58 pubkeys** (case-sensitive). Do not lowercase them.

## Setup

1. Run `frontend/supabase/schema.sql` then `frontend/supabase/bootstrap.sql` in Supabase SQL editor.
2. Copy `.env.example` → `.env` and set `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm install
npm test
npm run serve
```

## Commands

| Command | What |
| --- | --- |
| `npm run seed` | Wipe + insert demo Solana trades, index, settle |
| `npm run index` | Replay trades → scores / traders / positions |
| `npm run settle` | Past epochs → claims, expire stale |
| `npm run ingest-dex` | Pull live DEX fills for non-demo traders, then index |
| `npm run serve` | HTTP API + 5m cron (dex ingest + index + settle) |

## HTTP API

| Method | Path | Body |
| --- | --- | --- |
| GET | `/health` | — |
| POST | `/ingest/solana` | Solana fill batch `{ fills: [...] }` |
| POST | `/ingest/dex` | Pull live DEX fills for watched wallets |
| POST | `/ingest/trades` | `{ trades: [...] }` |
| POST | `/index` | Re-index + settle |
| POST | `/settle` | Settle only |
| POST | `/claim` | `{ wallet, signature, weekIndex? }` |
| GET | `/claims/:wallet` | List claims |

Protected routes require header `x-indexer-secret` matching `INDEXER_SECRET` (fail-closed).

## Solana fill shape

```json
{
  "fills": [{
    "wallet": "G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR",
    "symbol": "SOL",
    "side": "sell",
    "size": 10,
    "price": 140,
    "timestamp": "2026-08-10T12:00:00Z",
    "signature": "5x…"
  }]
}
```

Claim uses Solana `signMessage` on:

```
DBF claim
wallet:<base58>
week:all
```

Signature is base58 or base64 of the 64-byte ed25519 signature.

On-chain token transfer is not implemented yet — claim updates DB status only.

## Railway deploy

See **[RAILWAY.md](./RAILWAY.md)**.
