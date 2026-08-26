import http from 'node:http';
import { adminClient, getConfig } from './db.js';
import { verifyClaimSignature } from './auth.js';
import { startCron, runMaintenance } from './cron.js';
import { ingestTrades, normalizeSolanaFills } from './ingest.js';
import { readTreasuryWallet } from './treasury.js';
import { normalizeAddress } from './solana.js';
import { runIndexer } from './indexer.js';
import { claimRewards, settlePastEpochs } from './settle.js';

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-indexer-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function guard(req, secret) {
  if (!secret) return false;
  return req.headers['x-indexer-secret'] === secret;
}

export function createServer() {
  const config = getConfig();
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const url = new URL(req.url, `http://127.0.0.1`);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, { ok: true, cronMs: Number(process.env.CRON_MS || 300000) });
      }

      if (req.method === 'GET' && url.pathname === '/treasury') {
        const snap = await readTreasuryWallet();
        return json(res, 200, snap);
      }

      if (req.method === 'POST' && url.pathname === '/index') {
        if (!guard(req, config.indexerSecret)) return json(res, 401, { error: 'Unauthorized' });
        const result = await runMaintenance();
        return json(res, 200, result);
      }

      if (req.method === 'POST' && url.pathname === '/ingest/trades') {
        if (!guard(req, config.indexerSecret)) return json(res, 401, { error: 'Unauthorized' });
        const body = await readBody(req);
        const supabase = adminClient();
        const inserted = await ingestTrades(supabase, body.trades || body);
        const indexed = await runIndexer(supabase);
        return json(res, 200, { inserted, indexed });
      }

      if (
        req.method === 'POST' &&
        (url.pathname === '/ingest/solana' || url.pathname === '/ingest/l2')
      ) {
        if (!guard(req, config.indexerSecret)) return json(res, 401, { error: 'Unauthorized' });
        const body = await readBody(req);
        const supabase = adminClient();
        const trades = normalizeSolanaFills(body);
        const inserted = await ingestTrades(supabase, trades);
        const indexed = await runIndexer(supabase);
        return json(res, 200, { inserted, indexed, normalized: trades.length });
      }

      if (req.method === 'POST' && url.pathname === '/ingest/dex') {
        if (!guard(req, config.indexerSecret)) return json(res, 401, { error: 'Unauthorized' });
        const supabase = adminClient();
        const pulled = await syncDexFills(supabase);
        const indexed = await runIndexer(supabase);
        return json(res, 200, { pulled, indexed });
      }

      if (req.method === 'POST' && url.pathname === '/settle') {
        if (!guard(req, config.indexerSecret)) return json(res, 401, { error: 'Unauthorized' });
        const supabase = adminClient();
        const settled = await settlePastEpochs(supabase);
        return json(res, 200, settled);
      }

      if (req.method === 'POST' && url.pathname === '/claim') {
        const body = await readBody(req);
        await verifyClaimSignature({
          wallet: body.wallet,
          signature: body.signature,
          weekIndex: body.weekIndex ?? null,
        });
        const supabase = adminClient();
        const result = await claimRewards(supabase, body.wallet, body.weekIndex ?? null);
        return json(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname.startsWith('/claims/')) {
        const wallet = decodeURIComponent(url.pathname.slice('/claims/'.length));
        const supabase = adminClient();
        const { data, error } = await supabase
          .from('claims')
          .select('*')
          .eq('wallet_address', normalizeAddress(wallet))
          .order('week_index', { ascending: false });
        if (error) throw error;
        return json(res, 200, { claims: data || [] });
      }

      return json(res, 404, { error: 'Not found' });
    } catch (err) {
      return json(res, 400, { error: err.message || 'Request failed' });
    }
  });
}

export function startServer() {
  const config = getConfig();
  const server = createServer();
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`DBF API listening on 0.0.0.0:${config.port}`);
    startCron();
  });
  return server;
}
