// Pure formatting utilities — no side effects, no React imports

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats a number as USD currency, e.g. $12,345.67 */
export function formatUSD(value: number): string {
  return usdFormatter.format(value);
}

/** Formats a percent with explicit + prefix for positive values, e.g. +2.34% or -1.20% */
export function formatSignedPercent(value: number, decimals = 2): string {
  const fixed = value.toFixed(decimals);
  return value >= 0 ? `+${fixed}%` : `${fixed}%`;
}

/** Formats a future timestamp as a countdown string, e.g. "2h 34m 12s". Returns "Ended" if past. */
export function formatCountdown(endMs: number): string {
  const remaining = endMs - Date.now();
  if (remaining <= 0) return 'Ended';
  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

