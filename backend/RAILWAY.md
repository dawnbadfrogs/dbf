# Deploy DBF backend to Railway

## One-time setup

1. Create account at [railway.com](https://railway.com)
2. Install CLI:

```bash
npm install -g @railway/cli
railway login
```

3. From this folder (`backend/`):

```bash
cd backend
railway init          # new project, e.g. "dbf-api"
```

4. Set variables (Railway dashboard → service → Variables, or CLI):

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | `https://tfxqfcncdpglasljwxxu.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API → **service_role** |
| `EPOCH_POOL_DBF` | `100000` |
| `INDEXER_SECRET` | random string (required; protects `/index`, `/ingest/*`, `/settle`) |
| `HELIUS_API_KEY` | optional; parsed SWAP history. Public RPC used if unset |
| `SOLANA_RPC_URL` | optional; default `https://api.mainnet-beta.solana.com` |
| `WATCH_WALLETS` | optional comma-separated extra Solana pubkeys to poll |
| `CRON_MS` | `300000` (optional) |

Do **not** set `PORT` — Railway injects it automatically.

5. Deploy:

```bash
railway up
```

6. Public URL: Railway dashboard → service → **Settings → Networking → Generate Domain**

Copy the URL (e.g. `https://dbf-api-production.up.railway.app`).

## Wire frontend

In `frontend/.env` (and Vercel env later):

```env
VITE_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

Restart `npm run dev`, then test Claim on Tracker.

## Smoke test

```bash
curl https://YOUR-RAILWAY-DOMAIN.up.railway.app/health
# → {"ok":true,"cronMs":300000}
```

## GitHub deploy (optional)

Connect repo in Railway → set **Root Directory** to `backend` → auto-deploy on push.

## Logs

```bash
railway logs
```
