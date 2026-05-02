// Pure business logic calculations — no side effects, no React imports

import type { PositionsMap, PricesMap, DraftPick } from '../types';

/** Sums the current market value of all positions */
export function calcPortfolioValue(positions: PositionsMap, prices: PricesMap): number {
  return Object.values(positions).reduce((sum, pos) => {
    const price = prices[pos.symbol]?.price ?? pos.currentPrice;
    return sum + pos.shares * price;
  }, 0);
}

/** Returns cash + portfolio value */
export function calcNetWorth(cash: number, positions: PositionsMap, prices: PricesMap): number {
  return cash + calcPortfolioValue(positions, prices);
}

/** Returns overall portfolio return percent vs average cost basis */
export function calcReturnPercent(positions: PositionsMap, prices: PricesMap): number {
  let totalCost = 0;
  let totalValue = 0;
  for (const pos of Object.values(positions)) {
    const price = prices[pos.symbol]?.price ?? pos.currentPrice;
    totalCost += pos.shares * pos.avgCost;
    totalValue += pos.shares * price;
  }
  if (totalCost === 0) return 0;
  return ((totalValue - totalCost) / totalCost) * 100;
}

/**
 * Computes average gain percent across a set of draft picks vs their draft-time price.
 * Each pick is weighted equally (not by notional value).
 */
export function calcDraftPortfolioGain(picks: DraftPick[], prices: PricesMap): number {
  if (picks.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const pick of picks) {
    const current = prices[pick.symbol]?.price;
    if (!current || pick.draftPrice === 0) continue;
    total += (current - pick.draftPrice) / pick.draftPrice;
    count++;
  }
  if (count === 0) return 0;
  return (total / count) * 100;
}

/**
 * Determines the winner of a game given each player's picks and current prices.
 * Returns 'host', 'guest', or 'tie'.
 */
export function determineWinner(
  hostPicks: DraftPick[],
  guestPicks: DraftPick[],
  prices: PricesMap,
): 'host' | 'guest' | 'tie' {
  const hostGain = calcDraftPortfolioGain(hostPicks, prices);
  const guestGain = calcDraftPortfolioGain(guestPicks, prices);
  if (hostGain > guestGain) return 'host';
  if (guestGain > hostGain) return 'guest';
  return 'tie';
}
