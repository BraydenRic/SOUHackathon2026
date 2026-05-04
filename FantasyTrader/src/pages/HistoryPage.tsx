// History page — shows all completed games for the current user with gain %, result, and drafted stocks

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatSignedPercent } from '../utils/formatters';
import type { Room } from '../types';

/** Human-readable labels for each game duration key */
const durationLabels: Record<string, string> = { '1m': '1 Min', '1h': '1 Hour', '1d': '1 Day', '1w': '1 Week' };

/**
 * Formats a Unix timestamp (ms) as a short locale date string, e.g. "May 3, 2026".
 * Returns '—' if the timestamp is null (game was never ended cleanly).
 */
function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * HistoryPage — a chronological list of the current user's completed draft games.
 *
 * Firestore data note:
 *   A user can appear in a room as either the host or the guest, so we fire two
 *   parallel queries and merge the results. A `seen` Set de-duplicates room IDs in
 *   case the same room document somehow appears in both result sets.
 *
 * Each card shows:
 *   - Win / Loss / Tie badge + game duration pill
 *   - End date
 *   - This user's portfolio gain vs. the opponent's
 *   - The specific stock tickers this user drafted
 */
export default function HistoryPage() {
  const user = useAuthStore(s => s.user);
  const [games, setGames] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    async function fetchHistory() {
      if (!db || !user) return;
      // Fetch rooms where user was the host and rooms where they were the guest in parallel
      const [asHost, asGuest] = await Promise.all([
        getDocs(query(collection(db, 'rooms'), where('hostId', '==', user.uid), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'rooms'), where('guestId', '==', user.uid), where('status', '==', 'completed'))),
      ]);
      // De-duplicate in case a room somehow appears in both queries
      const seen = new Set<string>();
      const all: Room[] = [];
      for (const snap of [...asHost.docs, ...asGuest.docs]) {
        if (!seen.has(snap.id)) {
          seen.add(snap.id);
          all.push(snap.data() as Room);
        }
      }
      // Most recent games first
      all.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
      setGames(all);
      setLoading(false);
    }
    fetchHistory();
  }, [user]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 pb-8">
      <div className="max-w-3xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">History</h1>
          <p className="text-[#7a6e60] text-sm mt-1">Your completed draft games</p>
        </div>

        {games.length === 0 ? (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-[#7a6e60]" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="14" height="14" rx="2" strokeLinecap="round"/>
                <path d="M7 2v4M13 2v4M3 9h14" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[#ede8df] font-medium">No completed games yet</p>
            <p className="text-[#7a6e60] text-sm mt-1">Finish a draft game to see your results here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((room, i) => {
              // Determine this user's role and which gain field belongs to them
              const isHost = room.hostId === user?.uid;
              const myGain = isHost ? room.hostGainPercent : room.guestGainPercent;
              const oppGain = isHost ? room.guestGainPercent : room.hostGainPercent;
              const won = room.winnerId === user?.uid;
              // null winnerId means it was a tie (both gains were equal)
              const tied = !room.winnerId;
              const myPicks = room.picks.filter(p => p.userId === user?.uid);
              const result = tied ? 'Tie' : won ? 'Win' : 'Loss';

              return (
                <div
                  key={room.id}
                  className="bg-[#161311] border border-white/[0.07] rounded-2xl p-5 space-y-4 animate-fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Top row — result badge, duration pill, and end date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        tied
                          ? 'text-[#5a8a88] bg-[rgba(90,138,136,0.08)] border-[rgba(90,138,136,0.2)]'
                          : won
                          ? 'text-[#c8a882] bg-[rgba(200,168,130,0.08)] border-[rgba(200,168,130,0.2)]'
                          : 'text-[#ff4560] bg-[rgba(255,69,96,0.08)] border-[rgba(255,69,96,0.2)]'
                      }`}>
                        {result}
                      </span>
                      <span className="text-[#7a6e60] text-xs bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full">
                        {durationLabels[room.duration] ?? room.duration}
                      </span>
                    </div>
                    <p className="text-[#7a6e60] text-xs">{formatDate(room.endTime)}</p>
                  </div>

                  {/* Gain comparison — "Your gain" vs "Opponent's gain" */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Your gain', val: myGain, labelColor: 'text-[#7a6e60]' },
                      { label: "Opponent's gain", val: oppGain, labelColor: 'text-[#5a8a88]' },
                    ].map(({ label, val, labelColor }) => (
                      <div key={label}>
                        <p className={`${labelColor} text-[11px] mb-1 uppercase tracking-wide`}>{label}</p>
                        <p className={`font-mono font-black text-xl tabular-nums ${
                          val === undefined ? 'text-[#7a6e60]' :
                          val >= 0 ? 'text-[#22c55e]' : 'text-[#ff4560]'
                        }`}>
                          {/* `val === undefined` handles legacy rooms that pre-date gain recording */}
                          {val === undefined ? '—' : formatSignedPercent(val, 4)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Stock tickers the user drafted in this game */}
                  {myPicks.length > 0 && (
                    <div>
                      <p className="text-[#7a6e60] text-[11px] mb-2 uppercase tracking-wide">Your picks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {myPicks.map(p => (
                          <span key={p.symbol} className="text-xs font-mono font-black text-[#ede8df] bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-md">
                            {p.symbol}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
