# Dawn Bad Frogs

Cartoon underwater pond for **Rekt to Earn** on Solana. Swim the hub, open modules, climb the weekly loss board, and watch the treasury epoch clock.

## Stack

Vite + React 19, Tailwind v4, R3F / Three, GSAP, Privy, Supabase.

## Setup

```bash
cd frontend
cp .env.example .env
# fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PRIVY_APP_ID
npm install
npm run dev
```

Open http://localhost:5173/

## Routes

| Path | Screen |
| --- | --- |
| `/` | Hero |
| `/pond` | Frog hub |
| `/leaderboard` `/portfolio` `/tracker` `/treasury` `/nft` | Modules |
| `/about` `/faq` `/docs` | Info |

## Data

Leaderboard reads `public.traders`. Extra tables live in `supabase/schema.sql`. After the schema is applied, run the backend seeder so the board is not empty:

```bash
cd backend
cp .env.example .env   # add SUPABASE_SERVICE_ROLE_KEY
npm install
npm run seed
npm run serve
```

Set `VITE_API_URL=http://127.0.0.1:8787` in `frontend/.env` for Tracker claims. Unclaimed rewards expire after two weeks and return to treasury.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```
