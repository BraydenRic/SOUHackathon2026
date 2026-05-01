// Reads live stock prices from Firestore.
//
// Backend must write to:
//   prices/snapshot  →  { [symbol]: { price, prevClose, changePercent, lastUpdated } }

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PricesMap } from '../types';

export function useStockPrices(symbols: string[]): { prices: PricesMap; loading: boolean } {
  const [prices, setPrices] = useState<PricesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'prices', 'snapshot'),
      snapshot => {
        const data = snapshot.data();
        if (!data) return;
        setPrices(prev => {
          const next = { ...prev };
          for (const sym of symbols) {
            if (data[sym]) next[sym] = { ...data[sym], symbol: sym, stale: false };
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
