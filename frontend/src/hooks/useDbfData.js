import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallets, useSignMessage } from '@privy-io/react-auth/solana';
import { fetchTable, supabaseConfigured } from '../supabaseClient';
import { addressesMatch, normalizeAddress } from '../lib/format';
import { buildClaimMessage } from '../lib/claim';
import { bytesToBase64 } from '../lib/wallet';
import { getCurrentEpoch, epochCheckpoints } from '../lib/epoch';
import { summarizeTrades } from '../utils/pnlCalculator';
import { NFT_CATALOG } from '../lib/config';

function rankTraders(rows) {
  return [...(rows || [])]
    .sort((a, b) => Number(a.total_loss || 0) - Number(b.total_loss || 0))
    .map((trader, index) => ({ ...trader, rank: index + 1 }));
}

export function useEpoch(tickMs = 30_000) {
  const [epoch, setEpoch] = useState(() => getCurrentEpoch());
  useEffect(() => {
    const id = setInterval(() => setEpoch(getCurrentEpoch()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return epoch;
}

export function useTraders() {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabaseConfigured) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await fetchTable('traders', (q) =>
        q.select('*').order('total_loss', { ascending: true })
      );
      if (cancelled) return;
      if (fetchError && !data.length) setError(fetchError.message);
      else setError(null);
      setTraders(rankTraders(data));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { traders, loading, error };
}

export function useTraderForWallet(walletAddress) {
  const { traders, loading, error } = useTraders();
  const me = useMemo(
    () => traders.find((t) => addressesMatch(t.wallet_address, walletAddress)) || null,
    [traders, walletAddress]
  );
  return { me, traders, loading, error };
}

export function usePortfolio(walletAddress) {
  const { me, traders, loading: tradersLoading, error: tradersError } = useTraderForWallet(
    walletAddress
  );
  const [trades, setTrades] = useState([]);
  const [positionsTable, setPositionsTable] = useState([]);
  const [extraLoading, setExtraLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setTrades([]);
      setPositionsTable([]);
      setExtraLoading(false);
      return undefined;
    }
    let cancelled = false;
    setExtraLoading(true);
    (async () => {
      const addr = normalizeAddress(walletAddress);
      const [tradeRes, posRes] = await Promise.all([
        fetchTable('trades', (q) =>
          q.select('*').eq('wallet_address', addr).order('created_at', { ascending: true })
        ),
        fetchTable('positions', (q) => q.select('*').eq('wallet_address', addr)),
      ]);
      if (cancelled) return;
      setTrades(tradeRes.missing ? [] : tradeRes.data);
      setPositionsTable(posRes.missing ? [] : posRes.data);
      setExtraLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const derived = useMemo(() => summarizeTrades(trades), [trades]);

  const positions = useMemo(() => {
    if (positionsTable.length) {
      return positionsTable.map((row) => ({
        asset: row.asset,
        side: row.side || 'Long',
        size: Number(row.size_usd ?? row.size ?? 0),
        cost: Number(row.cost_basis ?? row.cost ?? 0),
        pnl: Number(row.unrealized_pnl ?? row.pnl ?? 0),
      }));
    }
    return derived.positions.map((p) => ({
      asset: p.asset,
      side: p.side,
      size: p.size,
      cost: p.cost,
      pnl: p.pnl,
    }));
  }, [positionsTable, derived.positions]);

  const openValue = positions.reduce((s, p) => s + Number(p.size || 0), 0);
  const unrealized = positions.reduce((s, p) => s + Number(p.pnl || 0), 0);
  const realized = trades.length ? derived.realizedPnL : Number(me?.total_loss || 0);

  return {
    connected: Boolean(walletAddress),
    me,
    traders,
    positions,
    openValue,
    unrealized,
    realized,
    loading: tradersLoading || extraLoading,
    error: tradersError,
    empty: Boolean(walletAddress) && !me && positions.length === 0,
  };
}

export function useTracker(walletAddress) {
  const epoch = useEpoch();
  const { me, traders, loading, error } = useTraderForWallet(walletAddress);
  const checkpoints = epochCheckpoints(epoch, {
    hasVerifiedLoss: Number(me?.total_loss || 0) < 0,
  });
  return { epoch, me, traders, checkpoints, loading, error, connected: Boolean(walletAddress) };
}

export function useClaims(walletAddress) {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const apiBase = import.meta.env.VITE_API_URL || '';

  const activeWallet = useMemo(
    () => wallets.find((w) => addressesMatch(w.address, walletAddress)) || wallets[0],
    [wallets, walletAddress]
  );

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setClaims([]);
      setLoading(false);
      return;
    }
    const { data, missing } = await fetchTable('claims', (q) =>
      q
        .select('*')
        .eq('wallet_address', normalizeAddress(walletAddress))
        .order('week_index', { ascending: false })
    );
    setClaims(missing ? [] : data);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claimable = claims.filter((c) => c.status === 'claimable');

  const claim = async () => {
    if (!apiBase) {
      setMessage('Claim API is offline. Run backend npm run serve.');
      return;
    }
    if (!activeWallet) {
      setMessage('Connect a wallet that can sign.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const msg = buildClaimMessage(walletAddress, 'all');
      const { signature } = await signMessage({
        message: new TextEncoder().encode(msg),
        wallet: activeWallet,
      });
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          signature: bytesToBase64(signature),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Claim failed');
      setMessage(
        body.claimed
          ? `Claimed ${Number(body.amount || 0).toLocaleString('en-US')}`
          : 'Nothing to claim'
      );
      await refresh();
    } catch (err) {
      setMessage(err.message || 'Claim failed');
    } finally {
      setBusy(false);
    }
  };

  return {
    claims,
    claimable,
    loading,
    busy,
    message,
    claim,
    apiReady: Boolean(apiBase),
  };
}

export function useTreasury() {
  const epoch = useEpoch();
  const { traders, loading, error } = useTraders();
  const [flows, setFlows] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [flowRes, snapRes] = await Promise.all([
        fetchTable('treasury_flows', (q) =>
          q.select('*').order('created_at', { ascending: false }).limit(12)
        ),
        fetchTable('treasury_snapshots', (q) =>
          q.select('*').order('created_at', { ascending: false }).limit(1)
        ),
      ]);
      if (cancelled) return;
      setFlows(flowRes.missing ? [] : flowRes.data);
      setSnapshot(snapRes.missing ? null : snapRes.data[0] || null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rewardPool = traders.reduce((s, t) => s + Number(t.expected_dbf_reward || 0), 0);

  return {
    epoch,
    traders,
    flows,
    snapshot,
    rewardPool,
    loading,
    error,
  };
}

export function useNfts(walletAddress) {
  const [collections, setCollections] = useState(NFT_CATALOG);
  const [held, setHeld] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [colRes, holdRes] = await Promise.all([
        fetchTable('nft_collections', (q) => q.select('*').order('name')),
        walletAddress
          ? fetchTable('nft_holders', (q) =>
              q.select('id').eq('wallet_address', normalizeAddress(walletAddress))
            )
          : Promise.resolve({ data: [], missing: true }),
      ]);
      if (cancelled) return;
      if (!colRes.missing && colRes.data.length) {
        setCollections(
          colRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            supply: c.supply || '—',
            status: c.status || 'TBA',
            floor: c.floor || 'TBA',
            accent: c.accent || '#FE77BC',
          }))
        );
      } else {
        setCollections(NFT_CATALOG);
      }
      setHeld(holdRes.missing ? 0 : holdRes.data.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return { collections, held, loading, connected: Boolean(walletAddress) };
}
