import { createClient } from '@supabase/supabase-js';

export function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return {
    url,
    serviceKey,
    anonKey,
    port: Number(process.env.PORT || 8787),
    epochPool: Number(process.env.EPOCH_POOL_DBF || 100000),
    indexerSecret: process.env.INDEXER_SECRET || '',
  };
}

export function adminClient() {
  const { url, serviceKey } = getConfig();
  if (!url || !serviceKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
