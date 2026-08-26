import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { supabase } from '../supabaseClient';

const SIZE = 512;

function formatLoss(n) {
  const lossNum = Number(n || 0);
  if (lossNum < 0) {
    return `-$${Math.abs(lossNum).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return `$${lossNum.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  return canvas;
}

const INK = '#111314';
const CREAM = '#EAF6D8';
const PANEL = '#2C3133';
const FONT = '"Fredoka", "Nunito", ui-rounded, system-ui, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function paintBase(ctx, accent) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Drop shadow
  ctx.fillStyle = INK;
  roundRect(ctx, SIZE * 0.1 + 8, SIZE * 0.1 + 8, SIZE * 0.8, SIZE * 0.8, 36);
  ctx.fill();

  // Sticker panel
  ctx.fillStyle = PANEL;
  roundRect(ctx, SIZE * 0.1, SIZE * 0.1, SIZE * 0.8, SIZE * 0.8, 36);
  ctx.fill();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  roundRect(ctx, SIZE * 0.1, SIZE * 0.1, SIZE * 0.8, SIZE * 0.8, 36);
  ctx.stroke();

  // Accent top stripe
  ctx.fillStyle = accent;
  roundRect(ctx, SIZE * 0.1 + 8, SIZE * 0.1 + 8, SIZE * 0.8 - 16, 28, 12);
  ctx.fill();

  // Soft highlight
  ctx.fillStyle = 'rgba(234,246,216,0.12)';
  roundRect(ctx, SIZE * 0.14, SIZE * 0.22, SIZE * 0.35, SIZE * 0.18, 16);
  ctx.fill();
}

function clipPlanet(ctx, draw) {
  ctx.save();
  roundRect(ctx, SIZE * 0.12, SIZE * 0.12, SIZE * 0.76, SIZE * 0.76, 30);
  ctx.clip();
  draw();
  ctx.restore();
}

export function drawLeaderboardTexture(ctx, rows, accent = '#70C431') {
  paintBase(ctx, accent);

  clipPlanet(ctx, () => {
    ctx.fillStyle = CREAM;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText('Rekt Leaderboard', 78, 130);

    ctx.fillStyle = INK;
    ctx.font = `700 16px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, 380, 98, 52, 26, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText('LIVE', 388, 117);

    ctx.strokeStyle = 'rgba(255,248,231,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(78, 148);
    ctx.lineTo(434, 148);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,248,231,0.45)';
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('#', 78, 178);
    ctx.fillText('WALLET', 120, 178);
    ctx.fillText('LOSS', 360, 178);

    const list = rows.slice(0, 5);
    if (!list.length) {
      ctx.fillStyle = 'rgba(255,248,231,0.5)';
      ctx.font = `600 20px ${FONT}`;
      ctx.fillText('No losses yet', 160, 270);
      return;
    }

    list.forEach((t, i) => {
      const y = 212 + i * 42;
      const wallet = t.wallet_address
        ? `${t.wallet_address.slice(0, 4)}…${t.wallet_address.slice(-3)}`
        : '????';
      const top = i < 3;

      ctx.fillStyle = top ? accent : 'rgba(255,248,231,0.55)';
      ctx.font = `700 18px ${FONT}`;
      ctx.fillText(`#${i + 1}`, 78, y);

      ctx.fillStyle = CREAM;
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(wallet, 120, y);

      ctx.fillStyle = '#FF5C7A';
      ctx.font = `700 17px ${FONT}`;
      ctx.fillText(formatLoss(t.total_loss), 350, y);
    });
  });
}

export function drawModuleTexture(ctx, title, lines, accent) {
  paintBase(ctx, accent);

  clipPlanet(ctx, () => {
    ctx.fillStyle = CREAM;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(title, 90, 140);

    ctx.strokeStyle = 'rgba(255,248,231,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 158);
    ctx.lineTo(420, 158);
    ctx.stroke();

    const widths = [0.72, 0.54, 0.85];
    (lines || []).forEach((line, i) => {
      const y = 200 + i * 70;
      ctx.fillStyle = 'rgba(255,248,231,0.7)';
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(line, 90, y);

      const w = 300 * widths[i % widths.length];
      const barY = y + 12;
      ctx.fillStyle = INK;
      roundRect(ctx, 94, barY + 3, w, 14, 7);
      ctx.fill();
      ctx.fillStyle = accent;
      roundRect(ctx, 90, barY, w, 14, 7);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      roundRect(ctx, 90, barY, w, 14, 7);
      ctx.stroke();
    });
  });
}

function canvasToTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Live leaderboard baked into a CanvasTexture for sphere decals */
export function useLeaderboardOrbTexture() {
  const { canvas, texture } = useMemo(() => {
    const canvas = makeCanvas();
    const ctx = canvas.getContext('2d');
    drawLeaderboardTexture(ctx, []);
    return { canvas, texture: canvasToTexture(canvas) };
  }, []);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('traders')
          .select('id, wallet_address, total_loss')
          .order('total_loss', { ascending: true })
          .limit(5);
        if (cancelled) return;
        const ctx = canvas.getContext('2d');
        drawLeaderboardTexture(ctx, data || []);
        texture.needsUpdate = true;
      } catch {
        if (!cancelled) {
          const ctx = canvas.getContext('2d');
          drawLeaderboardTexture(ctx, []);
          texture.needsUpdate = true;
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canvas, texture]);

  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture]
  );

  return { texture, ready };
}

/** Static module preview as CanvasTexture */
export function useModuleOrbTexture(title, lines, accent) {
  const texture = useMemo(() => {
    const canvas = makeCanvas();
    const ctx = canvas.getContext('2d');
    drawModuleTexture(ctx, title, lines, accent);
    return canvasToTexture(canvas);
  }, [title, lines, accent]);

  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture]
  );

  return texture;
}
