-- Run in Supabase SQL editor AFTER schema.sql (or paste both files back-to-back).
-- Solana demo wallets (base58 pubkeys). Then: cd backend && npm run serve

-- Clear demo rows (safe re-run)
delete from public.claims;
delete from public.epoch_scores;
delete from public.positions;
delete from public.trades;
delete from public.treasury_flows;
delete from public.treasury_snapshots;
delete from public.nft_holders;
delete from public.traders;
delete from public.epochs;

-- Epoch windows (Mon UTC)
insert into public.epochs (week_index, starts_at, ends_at, settled, reward_pool)
values
  (
    1,
    timestamptz '2026-08-03 00:00:00+00',
    timestamptz '2026-08-10 00:00:00+00',
    true,
    100000
  ),
  (
    2,
    date_trunc('week', now() at time zone 'utc') at time zone 'utc',
    date_trunc('week', now() at time zone 'utc') at time zone 'utc' + interval '7 days',
    false,
    100000
  )
on conflict (week_index) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  settled = excluded.settled,
  reward_pool = excluded.reward_pool;

-- Week 1 dumps + wash (timestamps inside epoch 1)
insert into public.trades (wallet_address, asset, type, amount, price, created_at) values
  ('G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', 'SOL', 'buy', 80, 180, '2026-08-03 02:00:00+00'),
  ('G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', 'SOL', 'sell', 80, 95, '2026-08-05 02:00:00+00'),
  ('EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', 'BONK', 'buy', 12000000, 0.000028, '2026-08-03 04:00:00+00'),
  ('EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', 'BONK', 'sell', 12000000, 0.000009, '2026-08-04 16:00:00+00'),
  ('GdZjQEAU74zs15ptPDTaTseZHMMrRUjfSWef7fC5hV5F', 'JUP', 'buy', 4000, 1.4, '2026-08-03 06:00:00+00'),
  ('GdZjQEAU74zs15ptPDTaTseZHMMrRUjfSWef7fC5hV5F', 'JUP', 'sell', 4000, 0.72, '2026-08-05 07:00:00+00'),
  ('9VdZR83eroeiE3mtH5WaeHsjeVXUJiuJj5t7ar2GzzUN', 'WIF', 'buy', 2200, 2.8, '2026-08-03 08:00:00+00'),
  ('9VdZR83eroeiE3mtH5WaeHsjeVXUJiuJj5t7ar2GzzUN', 'WIF', 'sell', 2200, 0.95, '2026-08-04 20:00:00+00'),
  ('Fkgb5J19nfHDyEczsMNxRJ8jtVy4Ljw6F9GWF3EgyKDe', 'POPCAT', 'buy', 8000, 0.9, '2026-08-03 10:00:00+00'),
  ('Fkgb5J19nfHDyEczsMNxRJ8jtVy4Ljw6F9GWF3EgyKDe', 'POPCAT', 'sell', 8000, 0.22, '2026-08-03 12:00:00+00');

-- Current epoch live board
insert into public.trades (wallet_address, asset, type, amount, price, created_at) values
  ('G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', 'SOL', 'buy', 40, 175, now() - interval '2 days'),
  ('G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', 'SOL', 'sell', 40, 110, now() - interval '1 day'),
  ('EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', 'BONK', 'buy', 8000000, 0.000026, now() - interval '2 days'),
  ('EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', 'BONK', 'sell', 8000000, 0.000011, now() - interval '1 day'),
  ('5KSf4mvfh5k5omxokShHHHTcsQWm9zpCFYF537qkRavy', 'JUP', 'buy', 9000, 1.35, now() - interval '3 days'),
  ('5KSf4mvfh5k5omxokShHHHTcsQWm9zpCFYF537qkRavy', 'JUP', 'sell', 9000, 0.68, now() - interval '1 day'),
  ('6CaSgpGA1198m5uWnsTGKTLiWg5b6nuFnsFkMA8F5Cfp', 'WIF', 'buy', 1100, 2.4, now() - interval '2 days'),
  ('6CaSgpGA1198m5uWnsTGKTLiWg5b6nuFnsFkMA8F5Cfp', 'WIF', 'sell', 1100, 1.1, now() - interval '1 day'),
  ('6PMj6JdEFS23Gz8oJFN4n8FmTZ5WomxKtQrBHnhZWK5r', 'SOL', 'buy', 18, 190, now() - interval '2 days'),
  ('6PMj6JdEFS23Gz8oJFN4n8FmTZ5WomxKtQrBHnhZWK5r', 'SOL', 'sell', 9, 140, now() - interval '1 day'),
  ('Fkgb5J19nfHDyEczsMNxRJ8jtVy4Ljw6F9GWF3EgyKDe', 'BONK', 'buy', 4000000, 0.00003, now() - interval '6 hours'),
  ('Fkgb5J19nfHDyEczsMNxRJ8jtVy4Ljw6F9GWF3EgyKDe', 'BONK', 'sell', 4000000, 0.000008, now() - interval '5 hours');

-- Current epoch leaderboard (indexed output)
insert into public.traders (wallet_address, total_loss, expected_dbf_reward) values
  ('5KSf4mvfh5k5omxokShHHHTcsQWm9zpCFYF537qkRavy', -37800, 59303),
  ('EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', -11700, 18356),
  ('G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', -8500, 13335),
  ('6CaSgpGA1198m5uWnsTGKTLiWg5b6nuFnsFkMA8F5Cfp', -3740, 5868),
  ('6PMj6JdEFS23Gz8oJFN4n8FmTZ5WomxKtQrBHnhZWK5r', -2000, 3138);

-- Week 1 settled scores + claims
insert into public.epoch_scores (week_index, wallet_address, realized_pnl, wash_pnl, eligible_loss, expected_dbf_reward) values
  (1, '9VdZR83eroeiE3mtH5WaeHsjeVXUJiuJj5t7ar2GzzUN', -34000, 0, -34000, 49419),
  (1, 'G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', -19200, 0, -19200, 27907),
  (1, 'EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', -9600, 0, -9600, 13953),
  (1, 'GdZjQEAU74zs15ptPDTaTseZHMMrRUjfSWef7fC5hV5F', -6000, 0, -6000, 8721),
  (1, 'Fkgb5J19nfHDyEczsMNxRJ8jtVy4Ljw6F9GWF3EgyKDe', 0, -15000, 0, 0);

insert into public.claims (week_index, wallet_address, amount, payout_asset, status, expires_at) values
  (1, '9VdZR83eroeiE3mtH5WaeHsjeVXUJiuJj5t7ar2GzzUN', 49419, 'TOKEN', 'claimable', now() at time zone 'utc' + interval '14 days'),
  (1, 'G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', 27907, 'TOKEN', 'claimable', now() at time zone 'utc' + interval '14 days'),
  (1, 'EQ6mqrYYfcB9aKrFv5sbJXMMM8gL26obasMeEF8QNRjj', 13953, 'TOKEN', 'claimable', now() at time zone 'utc' + interval '14 days'),
  (1, 'GdZjQEAU74zs15ptPDTaTseZHMMrRUjfSWef7fC5hV5F', 8721, 'TOKEN', 'claimable', now() at time zone 'utc' + interval '14 days');

insert into public.treasury_snapshots (balance_usd, epoch_in_usd) values (184000, 12600);
insert into public.treasury_flows (label, amount, type) values
  ('Protocol fees', 8200, 'in'),
  ('LP residual', 4400, 'in'),
  ('Epoch 1 reward pool', 100000, 'out');

insert into public.nft_collections (id, name, supply, status, floor, accent) values
  ('genesis', 'Bad Frog Genesis', '1,111', 'Live', '$1', '#FE77BC')
on conflict (id) do nothing;

insert into public.nft_holders (wallet_address, collection_id) values
  ('G6Lwq1FMdKie8j3p8ekj423mPJSxzSmXEWMe8LXgWVAR', 'genesis');
