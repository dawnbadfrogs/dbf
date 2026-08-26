import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function formatLoss(n) {
  const lossNum = Number(n || 0);
  if (lossNum < 0) {
    return `-$${Math.abs(lossNum).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`;
  }
  return `$${lossNum.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Mini Rekt Leaderboard clipped inside the star orb */
export function LeaderboardOrbPreview() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('traders')
          .select('id, wallet_address, total_loss, expected_dbf_reward')
          .order('total_loss', { ascending: true })
          .limit(5);

        if (!cancelled) setRows(data || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="orb-preview orb-preview--leaderboard">
      <div className="orb-preview-head">
        <span className="orb-preview-title">Rekt Leaderboard</span>
        <span className="orb-preview-badge">Live</span>
      </div>
      <div className="orb-preview-table">
        <div className="orb-preview-cols">
          <span>#</span>
          <span>Wallet</span>
          <span>Loss</span>
        </div>
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="orb-preview-row orb-preview-row--skel" />
          ))}
        {!loading &&
          rows.map((t, i) => {
            const wallet = t.wallet_address
              ? `${t.wallet_address.slice(0, 4)}…${t.wallet_address.slice(-3)}`
              : '????';
            return (
              <div
                key={t.id || i}
                className={`orb-preview-row ${i < 3 ? 'orb-preview-row--top' : ''}`}
              >
                <span className="orb-preview-rank">#{i + 1}</span>
                <span className="orb-preview-wallet">{wallet}</span>
                <span className="orb-preview-loss">{formatLoss(t.total_loss)}</span>
              </div>
            );
          })}
        {!loading && rows.length === 0 && (
          <div className="orb-preview-empty">No losses yet</div>
        )}
      </div>
    </div>
  );
}

const BAR_WIDTHS = [72, 54, 85];

export function ModuleOrbPreview({ title, lines, accent }) {
  return (
    <div className="orb-preview orb-preview--module" style={{ '--orb-accent': accent }}>
      <div className="orb-preview-head">
        <span className="orb-preview-title">{title}</span>
      </div>
      <div className="orb-preview-module-body">
        {lines.map((line, i) => (
          <div key={line} className="orb-preview-bar">
            <span>{line}</span>
            <i style={{ width: `${BAR_WIDTHS[i % BAR_WIDTHS.length]}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
