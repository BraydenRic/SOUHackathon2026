import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TitleBadge } from '../components/ui/TitleBadge';
import { TITLES, TITLE_MAP } from '../lib/titles';
import type { CoinTransaction } from '../types';

const SHOP_ICONS: Record<string, React.ReactElement> = {
  day_trader: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M13 2L3.5 13.5H10.5L9 22L20.5 10.5H13.5L13 2Z" />
    </svg>
  ),
  diamond_hands: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className="w-7 h-7">
      <polygon points="12,2 22,10 12,22 2,10" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  bull_run: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  bear_slayer: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M12 1L3 5V11C3 16.5 7 21.7 12 23C17 21.7 21 16.5 21 11V5L12 1Z" />
    </svg>
  ),
  whale: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <rect x="3" y="13" width="4" height="8" rx="1" />
      <rect x="9" y="8" width="4" height="13" rx="1" />
      <rect x="15" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  market_wizard: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path d="M12 2C12 2 13 7.5 17 8.5C13 9.5 12 15 12 15C12 15 11 9.5 7 8.5C11 7.5 12 2 12 2Z" />
      <path d="M19 14C19 14 19.5 17 21 17.5C19.5 18 19 21 19 21C19 21 18.5 18 17 17.5C18.5 17 19 14 19 14Z" />
      <path d="M5 14C5 14 5.5 17 7 17.5C5.5 18 5 21 5 21C5 21 4.5 18 3 17.5C4.5 17 5 14 5 14Z" />
    </svg>
  ),
};

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
      setTitleError(e instanceof Error ? e.message : 'Purchase failed — check your connection and try again.');
    } finally {
      setTitleLoading(null);
    }
  }

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908]">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Identity header */}
        <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-7">
          <div className="flex items-center gap-5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="h-16 w-16 rounded-2xl ring-1 ring-white/10 object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-[rgba(200,168,130,0.1)] border border-[rgba(200,168,130,0.2)] flex items-center justify-center text-[#c8a882] text-2xl font-black flex-shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-sans font-bold text-2xl tracking-tight text-[#ede8df] leading-none">
                {user.displayName}
              </h1>
              {user.title && (
                <div className="mt-2">
                  <TitleBadge titleId={user.title} size="md" />
                </div>
              )}
              <p className="text-[#7a6e60] text-sm mt-2">{user.email}</p>
            </div>

            {/* Coin balance */}
            <div className="flex-shrink-0 flex items-center gap-3 bg-[rgba(200,168,130,0.06)] border border-[rgba(200,168,130,0.14)] rounded-2xl px-5 py-3.5">
              <span className="text-[#c8a882] text-2xl font-black">◈</span>
              <div>
                <p className="text-[#c8a882] text-2xl font-black font-mono leading-none tabular-nums">{user.coins}</p>
                <p className="text-[rgba(200,168,130,0.5)] text-[10px] mt-0.5 uppercase tracking-widest">coins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Games Played', value: String(user.gamesPlayed), color: 'text-[#ede8df]' },
            { label: 'Games Won', value: String(user.gamesWon), color: 'text-[#22c55e]' },
            { label: 'Games Lost', value: String(user.gamesLost ?? 0), color: 'text-[#ff4560]' },
            { label: 'Win Rate', value: winRate, color: 'text-[#ede8df]' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#161311] border border-white/[0.07] rounded-2xl p-5 text-center">
              <p className={`font-mono font-bold text-3xl tabular-nums ${stat.color}`}>{stat.value}</p>
              <p className="text-[#7a6e60] text-[11px] mt-1.5 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Title shop */}
        <div className="bg-[#161311] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <h2 className="font-heading font-bold text-lg text-[#ede8df] tracking-tight">Titles</h2>
            <p className="text-[#7a6e60] text-sm mt-0.5">Shown next to your name everywhere in the app</p>
          </div>

          {titleError && (
            <div className="mx-5 mt-5 bg-[rgba(255,69,96,0.08)] border border-[rgba(255,69,96,0.2)] text-[#ff4560] text-sm px-4 py-2.5 rounded-xl">
              {titleError}
            </div>
          )}

          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TITLES.map(t => {
              const def = TITLE_MAP[t.id];
              const isOwned = owned.has(t.id);
              const isEquipped = user.title === t.id;
              const canAfford = user.coins >= t.cost;
              const isLoading = titleLoading === t.id;

              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 flex flex-col gap-4 transition-all duration-150 ${
                    isEquipped
                      ? `${def.bg}`
                      : 'bg-[#100e0c] border-white/[0.07]'
                  }`}
                >
                  <div className={def.color}>{SHOP_ICONS[t.id]}</div>

                  <div className="flex items-center gap-2">
                    <p className="text-[#ede8df] font-semibold text-sm">{t.label}</p>
                    {isEquipped && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${def.bg} ${def.color}`}>
                        On
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[#7a6e60] text-xs font-mono">
                      {isOwned ? 'Owned' : `${t.cost} ◈`}
                    </span>
                    <button
                      onClick={() => handleTitleAction(t.id, t.cost, t.label)}
                      disabled={isEquipped || isLoading || (!isOwned && !canAfford)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer disabled:cursor-not-allowed ${
                        isEquipped
                          ? 'text-[#7a6e60] cursor-default'
                          : isLoading
                          ? 'bg-white/[0.04] text-[#7a6e60] cursor-wait'
                          : isOwned
                          ? 'bg-white/[0.06] hover:bg-white/[0.1] text-[#ede8df]'
                          : canAfford
                          ? 'bg-[#c8a882] hover:bg-[#b8987a] text-black'
                          : 'bg-white/[0.03] text-[#3a3028] cursor-not-allowed'
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
        <div className="bg-[#161311] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <h2 className="font-heading font-bold text-lg text-[#ede8df] tracking-tight">Coin History</h2>
          </div>
          {txLoading ? (
            <div className="py-12 text-center text-[#7a6e60] text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="py-14 text-center space-y-1.5">
              <p className="text-[#ede8df] text-sm">No transactions yet</p>
              <p className="text-[#7a6e60] text-xs">Win a draft game to earn coins</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-[#ede8df] text-sm">{tx.reason}</p>
                    <p className="text-[#7a6e60] text-xs mt-0.5">
                      {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`font-mono font-bold text-sm tabular-nums ${tx.amount > 0 ? 'text-[#c8a882]' : 'text-[#ff4560]'}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ◈
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
