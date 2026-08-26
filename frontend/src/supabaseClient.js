import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function missingEnvMessage() {
  const missing = [];
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY');
  if (!import.meta.env.VITE_PRIVY_APP_ID) missing.push('VITE_PRIVY_APP_ID');
  return missing.length
    ? `Missing env: ${missing.join(', ')}. Copy frontend/.env.example to .env.`
    : null;
}

const missingTable = (error) =>
  error?.code === 'PGRST205' || /Could not find the table/i.test(error?.message || '');

export async function fetchTable(name, build = (q) => q) {
  if (!supabase) {
    return { data: [], error: new Error('Supabase is not configured'), missing: true };
  }
  const { data, error } = await build(supabase.from(name));
  if (error) {
    return { data: [], error, missing: missingTable(error) };
  }
  return { data: data || [], error: null, missing: false };
}
