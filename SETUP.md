# DBF setup (resume checklist)

## 1. Smoke test (local)

```bash
cd frontend && npm run dev
```

Open http://localhost:5173/ and click through:

- Hero → Get Started → pond → each frog module
- Connect **Solana** wallet on Tracker / Portfolio (Phantom, Solflare, or Privy embedded)
- About, FAQ, Docs

Privy dashboard: enable **Solana** (disable Ethereum if you want Solana-only).

Build check: `npm run build`

## 2. Database + demo data

Supabase project: `tfxqfcncdpglasljwxxu`

1. SQL editor → run **`frontend/supabase/schema.sql`**
2. SQL editor → run **`frontend/supabase/bootstrap.sql`** (Solana base58 demo wallets)
3. `backend/.env` → paste **`SUPABASE_SERVICE_ROLE_KEY`**

```bash
cd backend
npm install
npm test
npm run serve
```

After bootstrap you should see Solana pubkeys on the leaderboard (not `0x…` EVM addresses).

## 4. Product backend

| Endpoint | Purpose |
| --- | --- |
| `POST /ingest/solana` | Solana DEX fill webhook → `trades` (`x-indexer-secret` if set) |
| `POST /ingest/l2` | Alias of `/ingest/solana` |
| `POST /ingest/trades` | Raw trade rows |
| `POST /index` | Replay PnL + refresh leaderboard |
| `POST /settle` | Close past epochs → `claims` |
| `POST /claim` | Solana-signed claim (`wallet`, `signature`, optional `weekIndex`) |

Claim uses wallet `signMessage` (ed25519), not Ethereum `personal_sign`.
