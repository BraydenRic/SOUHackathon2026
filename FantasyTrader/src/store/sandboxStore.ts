// Sandbox Zustand store — portfolio state with Firestore persistence

import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PositionsMap, PricesMap, Transaction } from '../types';

const STARTING_CASH = 10_000;

interface SandboxState {
  cash: number;
  positions: PositionsMap;
  transactions: Transaction[];
  loading: boolean;
  /** Load portfolio state from Firestore for the given user. */
  loadFromFirestore: (userId: string) => Promise<void>;
  /** Persist current state to Firestore. */
  saveToFirestore: (userId: string) => Promise<void>;
  /** Buy shares — validates cash, computes weighted avg cost, then persists. */
  buy: (symbol: string, shares: number, price: number, userId: string) => void;
  /** Sell shares — validates ownership, reduces position, then persists. */
  sell: (symbol: string, shares: number, price: number, userId: string) => void;
  /** Sync current prices into positions without triggering a Firestore save. */
  updatePrices: (prices: PricesMap) => void;
  /** Reset to $10,000 and clear all positions/transactions, then persists. */
  reset: (userId: string) => void;
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  cash: STARTING_CASH,
  positions: {},
  transactions: [],
  loading: false,

  async loadFromFirestore(userId) {
    if (!db) return;
    set({ loading: true });
    try {
      const snap = await getDoc(doc(db, 'sandbox', userId));
      if (snap.exists()) {
        const data = snap.data();
        set({
          cash: data.cash ?? STARTING_CASH,
          positions: data.positions ?? {},
          transactions: data.transactions ?? [],
          loading: false,
        });
      } else {
        set({ cash: STARTING_CASH, positions: {}, transactions: [], loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  async saveToFirestore(userId) {
    if (!db) return;
    const { cash, positions, transactions } = get();
    await setDoc(doc(db, 'sandbox', userId), { cash, positions, transactions });
  },

  buy(symbol, shares, price, userId) {
    const { cash, positions } = get();
    const total = shares * price;
    if (total > cash) return;

    const existing = positions[symbol];
    const newAvgCost = existing
      ? (existing.avgCost * existing.shares + total) / (existing.shares + shares)
      : price;

    const tx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol, type: 'buy', shares, pricePerShare: price, total, timestamp: Date.now(),
    };

    set(s => ({
      cash: s.cash - total,
      positions: {
        ...s.positions,
        [symbol]: {
          symbol,
          shares: (existing?.shares ?? 0) + shares,
          avgCost: newAvgCost,
          currentPrice: price,
        },
      },
      transactions: [tx, ...s.transactions],
    }));
    get().saveToFirestore(userId);
  },

  sell(symbol, shares, price, userId) {
    const { positions } = get();
    const existing = positions[symbol];
    if (!existing || existing.shares < shares) return;

    const total = shares * price;
    const tx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol, type: 'sell', shares, pricePerShare: price, total, timestamp: Date.now(),
    };

    set(s => {
      const remaining = existing.shares - shares;
      const newPositions = { ...s.positions };
      if (remaining <= 0) {
        delete newPositions[symbol];
      } else {
        newPositions[symbol] = { ...existing, shares: remaining, currentPrice: price };
      }
      return { cash: s.cash + total, positions: newPositions, transactions: [tx, ...s.transactions] };
    });
    get().saveToFirestore(userId);
  },

  updatePrices(prices) {
    set(s => {
      const updated = { ...s.positions };
      for (const sym of Object.keys(updated)) {
        if (prices[sym]) updated[sym] = { ...updated[sym], currentPrice: prices[sym].price };
      }
      return { positions: updated };
    });
  },

  reset(userId) {
    set({ cash: STARTING_CASH, positions: {}, transactions: [] });
    get().saveToFirestore(userId);
  },
}));
