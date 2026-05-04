// Subscribes to live stock prices from a shared Firestore document (prices/latest).
// On error, marks cached prices as stale rather than clearing them so the UI degrades gracefully.
//
// Firestore doc shape written by the backend price updater:
//   prices/latest → { prices: { [symbol]: { price, prevClose, changePercent, updatedAt } } }

import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PricesMap } from '../types';

/**
 * Real-time hook that keeps a subset of the shared price document in sync.
 * @param symbols - Ticker symbols to extract from the shared Firestore price document.
 * @returns prices map and a loading flag that clears on the first snapshot.
 */
export function useStockPrices(symbols: string[]): { prices: PricesMap; loading: boolean } {
  const [prices, setPrices] = useState<PricesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'prices', 'latest'),
      snapshot => {
        const data = snapshot.data();
        if (!data?.prices) return;
        const raw = data.prices as Record<string, { price: number; prevClose: number; changePercent: number; updatedAt: Timestamp }>;
        setPrices(prev => {
          const next = { ...prev };
          for (const sym of symbols) {
            const entry = raw[sym];
            if (!entry) continue;
            next[sym] = {
              symbol: sym,
              price: entry.price,
              prevClose: entry.prevClose ?? 0,
              changePercent: entry.changePercent ?? 0,
              lastUpdated: entry.updatedAt instanceof Timestamp ? entry.updatedAt.toMillis() : Date.now(),
              stale: false,
            };
          }
          return next;
        });
        setLoading(false);
      },
      () => {
        setPrices(prev => {
          const next = { ...prev };
          for (const sym of Object.keys(next)) next[sym] = { ...next[sym], stale: true };
          return next;
        });
        setLoading(false);
      },
    );

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { prices, loading };
}
