import { adminClient, getConfig } from './db.js';
import { runIndexer } from './indexer.js';
import { settlePastEpochs } from './settle.js';
import { syncDexFills } from './dex/sync.js';

let timer = null;
let running = false;

export async function runMaintenance() {
  if (running) return { skipped: true };
  running = true;
  try {
    const supabase = adminClient();
    const pulled = await syncDexFills(supabase);
    const indexed = await runIndexer(supabase);
    const settled = await settlePastEpochs(supabase);
    return { pulled, indexed, settled, at: new Date().toISOString() };
  } finally {
    running = false;
  }
}

export function startCron() {
  const ms = Number(process.env.CRON_MS || 5 * 60 * 1000);
  if (timer) return;
  timer = setInterval(() => {
    runMaintenance().catch((err) => console.error('[cron]', err.message));
  }, ms);
  console.log(`[cron] dex ingest + index + settle every ${Math.round(ms / 1000)}s`);
}

export function stopCron() {
  if (timer) clearInterval(timer);
  timer = null;
}

void getConfig;
