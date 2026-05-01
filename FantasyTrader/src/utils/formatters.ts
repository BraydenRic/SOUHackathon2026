// Pure formatting utilities — no side effects, no React imports

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats a number as USD currency, e.g. $12,345.67 */
export function formatUSD(value: number): string {
  return usdFormatter.format(value);
}

/** Formats a percent with explicit + prefix for positive values, e.g. +2.34% or -1.20% */
export function formatSignedPercent(value: number): string {
  const fixed = value.toFixed(2);
  return value >= 0 ? `+${fixed}%` : `${fixed}%`;
}

