// Pure business logic calculations — no side effects, no React imports

import type { PositionsMap, PricesMap } from '../types';

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
