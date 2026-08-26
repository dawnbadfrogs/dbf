import { TOKEN_SYMBOL } from './config';

export function shortAddress(address, head = 4, tail = 4) {
  if (!address || typeof address !== 'string') return 'Unknown wallet';
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function normalizeAddress(address) {
  return (address || '').trim();
}

export function addressesMatch(a, b) {
  if (!a || !b) return false;
  return normalizeAddress(a) === normalizeAddress(b);
}

export function formatUsd(value, { signed = false, digits = 2 } = {}) {
  const n = Number(value || 0);
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (signed) {
    if (n < 0) return `-$${abs}`;
    if (n > 0) return `+$${abs}`;
  }
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

export function formatDbf(value, digits = 0) {
  const n = Number(value || 0);
  return `${n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${TOKEN_SYMBOL}`;
}

export function formatUtc(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' UTC';
}
