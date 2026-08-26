-- Dawn Bad Frogs schema (Solana wallets: base58 pubkeys in wallet_address)
-- Run in Supabase SQL editor (or `npm run db:apply` from /backend).
-- Public read. Writes are service-role / indexer only.

create extension if not exists pgcrypto;

create table if not exists public.traders (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  twitter_handle text,
  total_loss numeric not null default 0,
  expected_dbf_reward numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.epochs (
  id uuid primary key default gen_random_uuid(),
  week_index int not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  settled boolean not null default false,
  reward_pool numeric not null default 0,
  settled_at timestamptz
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  asset text not null,
  type text not null check (type in ('buy', 'sell')),
  amount numeric not null,
  price numeric not null,
  created_at timestamptz not null default now(),
  tx_hash text,
  wash boolean not null default false,
  realized_pnl numeric,
  epoch_week int
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  asset text not null,
  side text not null default 'Long',
  size_usd numeric not null default 0,
  cost_basis numeric not null default 0,
  unrealized_pnl numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.epoch_scores (
  id uuid primary key default gen_random_uuid(),
  week_index int not null,
  wallet_address text not null,
  realized_pnl numeric not null default 0,
  wash_pnl numeric not null default 0,
  eligible_loss numeric not null default 0,
  expected_dbf_reward numeric not null default 0,
  unique (week_index, wallet_address)
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  week_index int not null,
  wallet_address text not null,
  amount numeric not null default 0,
  payout_asset text not null default 'TOKEN' check (payout_asset in ('ETH', 'USDG', 'TOKEN')),
  status text not null default 'claimable' check (status in ('claimable', 'claimed', 'expired')),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (week_index, wallet_address)
);

create table if not exists public.treasury_flows (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric not null,
  type text not null check (type in ('in', 'out')),
  created_at timestamptz not null default now()
);

create table if not exists public.treasury_snapshots (
  id uuid primary key default gen_random_uuid(),
  balance_usd numeric not null default 0,
  epoch_in_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.nft_collections (
  id text primary key,
  name text not null,
  supply text,
  status text,
  floor text,
  accent text
);

create table if not exists public.nft_holders (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  collection_id text references public.nft_collections (id),
  created_at timestamptz not null default now()
);

create table if not exists public.indexer_state (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.trades add column if not exists tx_hash text;
alter table public.trades add column if not exists wash boolean not null default false;
alter table public.trades add column if not exists realized_pnl numeric;
alter table public.trades add column if not exists epoch_week int;
alter table public.epochs add column if not exists reward_pool numeric not null default 0;
alter table public.epochs add column if not exists settled_at timestamptz;

alter table public.traders enable row level security;
alter table public.epochs enable row level security;
alter table public.trades enable row level security;
alter table public.positions enable row level security;
alter table public.epoch_scores enable row level security;
alter table public.claims enable row level security;
alter table public.treasury_flows enable row level security;
alter table public.treasury_snapshots enable row level security;
alter table public.nft_collections enable row level security;
alter table public.nft_holders enable row level security;
alter table public.indexer_state enable row level security;

drop policy if exists "public read traders" on public.traders;
drop policy if exists "public read epochs" on public.epochs;
drop policy if exists "public read trades" on public.trades;
drop policy if exists "public read positions" on public.positions;
drop policy if exists "public read epoch_scores" on public.epoch_scores;
drop policy if exists "public read claims" on public.claims;
drop policy if exists "public read treasury_flows" on public.treasury_flows;
drop policy if exists "public read treasury_snapshots" on public.treasury_snapshots;
drop policy if exists "public read nft_collections" on public.nft_collections;
drop policy if exists "public read nft_holders" on public.nft_holders;

create policy "public read traders" on public.traders for select using (true);
create policy "public read epochs" on public.epochs for select using (true);
create policy "public read trades" on public.trades for select using (true);
create policy "public read positions" on public.positions for select using (true);
create policy "public read epoch_scores" on public.epoch_scores for select using (true);
create policy "public read claims" on public.claims for select using (true);
create policy "public read treasury_flows" on public.treasury_flows for select using (true);
create policy "public read treasury_snapshots" on public.treasury_snapshots for select using (true);
create policy "public read nft_collections" on public.nft_collections for select using (true);
create policy "public read nft_holders" on public.nft_holders for select using (true);

create index if not exists trades_wallet_idx on public.trades (wallet_address);
create index if not exists trades_created_idx on public.trades (created_at);
create unique index if not exists trades_tx_wallet_asset_type_uidx
  on public.trades (tx_hash, wallet_address, asset, type)
  where tx_hash is not null;
create index if not exists positions_wallet_idx on public.positions (wallet_address);
create unique index if not exists positions_wallet_asset_uidx
  on public.positions (wallet_address, asset);
create index if not exists nft_holders_wallet_idx on public.nft_holders (wallet_address);
create index if not exists claims_wallet_idx on public.claims (wallet_address);
create index if not exists claims_status_idx on public.claims (status);
create index if not exists epoch_scores_week_idx on public.epoch_scores (week_index);
