// Profile page — player identity, stats, title shop, and coin transaction history

import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TitleBadge } from '../components/ui/TitleBadge';
import { TITLES, TITLE_MAP } from '../lib/titles';
import type { CoinTransaction } from '../types';

// SVG icons for the large title shop cards — same paths as TitleBadge but rendered bigger
const SHOP_ICONS: Record<string, React.ReactElement> = {
  day_trader: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M13 2L3.5 13.5H10.5L9 22L20.5 10.5H13.5L13 2Z" />
    </svg>
  ),
  diamond_hands: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className="w-8 h-8">
      <polygon points="12,2 22,10 12,22 2,10" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  bull_run: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  bear_slayer: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M12 1L3 5V11C3 16.5 7 21.7 12 23C17 21.7 21 16.5 21 11V5L12 1Z" />
    </svg>
  ),
  whale: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <rect x="3"  y="13" width="4" height="8" rx="1" />
      <rect x="9"  y="8"  width="4" height="13" rx="1" />
      <rect x="15" y="3"  width="4" height="18" rx="1" />
    </svg>
  ),
  market_wizard: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M12 2C12 2 13 7.5 17 8.5C13 9.5 12 15 12 15C12 15 11 9.5 7 8.5C11 7.5 12 2 12 2Z" />
      <path d="M19 14C19 14 19.5 17 21 17.5C19.5 18 19 21 19 21C19 21 18.5 18 17 17.5C18.5 17 19 14 19 14Z" />
      <path d="M5 14C5 14 5.5 17 7 17.5C5.5 18 5 21 5 21C5 21 4.5 18 3 17.5C4.5 17 5 14 5 14Z" />
    </svg>
  ),
};

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'blue' }) {
  const colors = { emerald: 'text-emerald-400', blue: 'text-blue-400' };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
      <p className={`text-3xl font-bold font-mono ${accent ? colors[accent] : 'text-zinc-100'}`}>{value}</p>
      <p className="text-zinc-500 text-xs mt-1.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

/** Profile page — player identity, lifetime stats, title shop, and coin history. */
export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const { purchaseTitle, equipTitle } = useAuthStore();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [titleLoading, setTitleLoading] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) { setTxLoading(false); return; }
    (async () => {
      try {
        const q = query(
          collection(db!, 'coinTransactions'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(20),
        );
        const snap = await getDocs(q);
        setTransactions(snap.docs.map(d => d.data() as CoinTransaction));
      } catch {
        setTransactions([]);
      } finally {
        setTxLoading(false);
      }
    })();
  }, [user?.uid]);

  if (!user) return <LoadingSpinner fullScreen />;

  const winRate = user.gamesPlayed > 0
    ? `${((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)}%`
    : '—';

  const photoSrc = user.photoURL ?? null;
  const owned = new Set(user.purchasedTitles ?? []);

  async function handleTitleAction(titleId: string, cost: number, label: string) {
    setTitleError(null);
    setTitleLoading(titleId);
    try {
      if (owned.has(titleId)) {
        await equipTitle(titleId);
      } else {
        await purchaseTitle(titleId, cost, label);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Purchase failed — check your connection and try again.';
      setTitleError(msg);
    } finally {
      setTitleLoading(null);
    }
  }

  return (
    <div className="pt-14 min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Identity header */}
        <div className="flex items-center gap-6">
          {photoSrc ? (
            <img src={photoSrc} alt={user.displayName} className="h-20 w-20 rounded-full ring-2 ring-zinc-700 object-cover" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-emerald-600 flex items-center justify-center text-white text-3xl font-bold ring-2 ring-zinc-700">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-zinc-100 text-3xl font-bold tracking-tight">{user.displayName}</h1>
            {user.title && (
              <div className="mt-2">
                <TitleBadge titleId={user.title} size="md" />
              </div>
            )}
            <p className="text-zinc-500 text-sm mt-1.5">{user.email}</p>
          </div>
          {/* Coin balance */}
          <div className="ml-auto inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-6 py-3">
            <span className="text-3xl select-none">🪙</span>
            <div>
              <p className="text-amber-300 text-3xl font-bold font-mono leading-none">{user.coins}</p>
              <p className="text-amber-500/60 text-xs mt-0.5 uppercase tracking-wide">coins</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Games Played" value={String(user.gamesPlayed)} />
          <StatCard label="Games Won" value={String(user.gamesWon)} accent="emerald" />
          <StatCard label="Games Lost" value={String(user.gamesLost ?? 0)} />
          <StatCard label="Win Rate" value={winRate} accent="blue" />
        </div>

        {/* Title shop */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-zinc-100 font-semibold">Titles</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Shown next to your name everywhere in the app</p>
          </div>

          {titleError && (
            <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              {titleError}
            </div>
          )}

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TITLES.map(t => {
              const def = TITLE_MAP[t.id];
              const isOwned = owned.has(t.id);
              const isEquipped = user.title === t.id;
              const canAfford = user.coins >= t.cost;
              const isLoading = titleLoading === t.id;

              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 flex flex-col gap-4 transition-colors
                    ${isEquipped
                      ? `${def.bg} border-opacity-60`
                      : 'bg-zinc-800/50 border-zinc-700/60'
                    }`}
                >
                  {/* Icon */}
                  <div className={`${def.color}`}>
                    {SHOP_ICONS[t.id]}
                  </div>

                  {/* Label + equipped badge */}
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-100 font-semibold text-sm">{t.label}</p>
                    {isEquipped && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${def.bg} ${def.color}`}>On</span>
                    )}
                  </div>

                  {/* Cost + action */}
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-mono">
                      {isOwned ? 'Owned' : `${t.cost} 🪙`}
                    </span>
                    <button
                      onClick={() => handleTitleAction(t.id, t.cost, t.label)}
                      disabled={isEquipped || isLoading || (!isOwned && !canAfford)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
                        ${isEquipped
                          ? 'text-zinc-600 cursor-default'
                          : isLoading
                            ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                            : isOwned
                              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 cursor-pointer'
                              : canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer'
                                : 'bg-zinc-700/50 text-zinc-600 cursor-not-allowed'
                        }`}
                    >
                      {isLoading ? '…' : isEquipped ? 'Equipped' : isOwned ? 'Equip' : 'Buy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coin history */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-zinc-100 font-semibold">Coin History</h2>
          </div>
          {txLoading ? (
            <div className="py-14 text-center text-zinc-500 text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-zinc-500 text-sm">No transactions yet.</p>
              <p className="text-zinc-600 text-xs">Win a draft game to earn coins.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="text-zinc-200 text-sm">{tx.reason}</p>
                    <p className="text-zinc-600 text-xs mt-0.5">
                      {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`font-mono font-bold text-sm tabular-nums ${tx.amount > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}&nbsp;🪙
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
