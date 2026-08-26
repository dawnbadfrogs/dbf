#!/usr/bin/env bash
# Run from backend/ after: railway login && railway init
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v railway >/dev/null 2>&1; then
  echo "Install CLI: npm install -g @railway/cli"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login"
  exit 1
fi

# railway init creates a project but no service — add one if missing
if railway status 2>&1 | grep -q "Service:         None"; then
  echo "Creating service dbf-api..."
  railway add --service dbf-api --json >/dev/null
  railway service link dbf-api
fi

if [[ ! -f .env ]]; then
  echo "Missing backend/.env — copy from .env.example first"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env"
  exit 1
fi

if [[ -z "${INDEXER_SECRET:-}" ]]; then
  INDEXER_SECRET=$(openssl rand -hex 24)
  echo "Generated INDEXER_SECRET (saved to Railway only)"
fi

railway variables set \
  "SUPABASE_URL=${SUPABASE_URL}" \
  "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}" \
  "EPOCH_POOL_DBF=${EPOCH_POOL_DBF:-100000}" \
  "INDEXER_SECRET=${INDEXER_SECRET}" \
  "CRON_MS=${CRON_MS:-300000}"

echo ""
echo "Deploying..."
railway up --detach

echo ""
echo "Next:"
echo "  1. railway domain   (or generate domain in Railway dashboard)"
echo "  2. curl https://YOUR-DOMAIN/health"
echo "  3. Set frontend VITE_API_URL to that URL"
