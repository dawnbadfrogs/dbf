import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminClient } from './db.js';
import { runIndexer } from './indexer.js';
import { seedDemo } from './seed.js';
import { seedWallet } from './seedWallet.js';
import { syncDexFills } from './dex/sync.js';
import { settlePastEpochs } from './settle.js';
import { startServer } from './server.js';
import { purgeDemo } from './purgeDemo.js';
import { syncTreasury } from './treasury.js';

const root = dirname(fileURLToPath(import.meta.url));

async function loadEnv() {
  const envPath = resolve(root, '../.env');
  try {
    const text = await readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
  // Fall back to frontend env for URL / anon if present
  try {
    const fe = await readFile(resolve(root, '../../frontend/.env'), 'utf8');
    for (const line of fe.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key === 'VITE_SUPABASE_URL' && !process.env.SUPABASE_URL) {
        process.env.SUPABASE_URL = value;
      }
      if (key === 'VITE_SUPABASE_ANON_KEY' && !process.env.SUPABASE_ANON_KEY) {
        process.env.SUPABASE_ANON_KEY = value;
      }
    }
  } catch {
    // optional
  }
}

const cmd = process.argv[2] || 'help';

await loadEnv();

if (cmd === 'serve') {
  startServer();
} else if (cmd === 'index') {
  const supabase = adminClient();
  const indexed = await runIndexer(supabase);
  console.log('indexed', indexed);
} else if (cmd === 'settle') {
  const supabase = adminClient();
  const settled = await settlePastEpochs(supabase);
  console.log('settled', settled);
} else if (cmd === 'seed') {
  const supabase = adminClient();
  const seeded = await seedDemo(supabase);
  const indexed = await runIndexer(supabase);
  const settled = await settlePastEpochs(supabase);
  console.log('seeded', seeded);
  console.log('indexed', indexed);
  console.log('settled', settled);
} else if (cmd === 'seed-wallet') {
  const address = process.argv[3];
  if (!address) {
    console.error('Usage: node src/cli.js seed-wallet <solana-address>');
    process.exit(1);
  }
  const supabase = adminClient();
  const result = await seedWallet(supabase, address);
  console.log('seed-wallet', result);
} else if (cmd === 'ingest-dex') {
  const refresh = process.argv.includes('--refresh');
  const supabase = adminClient();
  const pulled = await syncDexFills(supabase, { refresh, limit: refresh ? 40 : 20 });
  const indexed = await runIndexer(supabase);
  console.log('ingest-dex', pulled);
  console.log('indexed', indexed);
} else if (cmd === 'purge-demo') {
  const supabase = adminClient();
  const deleted = await purgeDemo(supabase);
  const indexed = await runIndexer(supabase);
  let treasury = null;
  try {
    treasury = await syncTreasury(supabase);
  } catch (err) {
    treasury = { error: err.message };
  }
  console.log('purge-demo', deleted);
  console.log('indexed', indexed);
  console.log('treasury', treasury);
} else {
  console.log(`Usage:
  node src/cli.js seed                 wipe demo rows, insert trades, index, settle
  node src/cli.js seed-wallet <addr>   add one Solana wallet + claimable past epoch
  node src/cli.js ingest-dex [--refresh]  pull live DEX fills for non-demo traders
  node src/cli.js purge-demo           remove seed wallets + dummy treasury, reindex
  node src/cli.js index                replay trades → scores / traders / positions
  node src/cli.js settle               freeze past epochs into claims, expire leftovers
  node src/cli.js serve                claim + index HTTP API
`);
  process.exit(cmd === 'help' ? 0 : 1);
}
