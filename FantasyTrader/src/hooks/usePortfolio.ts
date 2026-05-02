// Derives per-player portfolio performance from draft picks and live prices

import { useMemo } from 'react';
import type { DraftPick, PricesMap } from '../types';
import { calcDraftPortfolioGain } from '../utils/calculations';

interface PortfolioStats {
  gainPercent: number;
  picks: DraftPick[];
}

/**
 * Computes memoized portfolio stats for host and guest from their draft picks and current prices.
 * @param hostPicks - Draft picks belonging to the host
 * @param guestPicks - Draft picks belonging to the guest
 * @param prices - Live prices map keyed by symbol
 */
export function usePortfolio(
  hostPicks: DraftPick[],
  guestPicks: DraftPick[],
  prices: PricesMap,
): { host: PortfolioStats; guest: PortfolioStats } {
  return useMemo(() => ({
    host: { gainPercent: calcDraftPortfolioGain(hostPicks, prices), picks: hostPicks },
    guest: { gainPercent: calcDraftPortfolioGain(guestPicks, prices), picks: guestPicks },
  }), [hostPicks, guestPicks, prices]);
}
