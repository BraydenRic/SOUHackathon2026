// Leaderboard page — global rankings by wins, top 50 players fetched from Firestore

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TitleBadge } from '../components/ui/TitleBadge';
import type { User } from '../types';

/** Medal emoji for positions 1–3; positions 4+ use a plain number */
const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * LeaderboardPage — global player rankings sorted by total wins.
 *
 * Data: fetches the top 50 users from Firestore ordered by `gamesWon` descending.
 * Players with zero games played are filtered out client-side so the list only
 * shows users who have actually competed.
 *
 * The current user's row gets a subtle amber highlight and a "you" label so they
 * can quickly find their own standing in the list.
 *
 * Columns: rank · player (avatar + name + title) · W · L · Win% · coins (◈)
 */
export default function LeaderboardPage() {
  const currentUser = useAuthStore(s => s.user);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    async function fetchLeaderboard() {
      if (!db) return;
      const snap = await getDocs(
        query(collection(db, 'users'), orderBy('gamesWon', 'desc'), limit(50))
      );
      // Filter out users who have never finished a game — they'd just clutter the top of the list
      setPlayers(snap.docs.map(d => d.data() as User).filter(p => p.gamesPlayed > 0));
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 pb-8">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Leaderboard</h1>
          <p className="text-[#7a6e60] text-sm mt-1">Top traders by wins</p>
        </div>

        {players.length === 0 ? (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-12 text-center">
            <p className="text-[#ede8df] font-medium">No players yet</p>
            <p className="text-[#7a6e60] text-sm mt-1">Complete a game to appear here</p>
          </div>
        ) : (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Column headers: rank · player · W · L · Win% · coins */}
            <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_4.5rem_3.5rem] gap-2 px-4 py-3 border-b border-white/[0.06]">
              {['#', 'Player', 'W', 'L', 'Win%', '◈'].map((h, i) => (
                <span key={h} className={`text-[11px] font-medium uppercase tracking-widest ${i === 0 || i >= 2 ? 'text-center' : ''} ${h === 'W' ? 'text-[#5a8a88]' : 'text-[#7a6e60]'}`}>
                  {h}
                </span>
              ))}
            </div>

            {players.map((player, i) => {
              const isMe = player.uid === currentUser?.uid;
              const winRate = player.gamesPlayed > 0
                ? `${((player.gamesWon / player.gamesPlayed) * 100).toFixed(0)}%`
                : '—';
              const initial = player.displayName?.[0]?.toUpperCase() ?? '?';
              const isTop3 = i < 3;

              return (
                <div
                  key={player.uid}
                  className={`grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_4.5rem_3.5rem] gap-2 items-center px-4 py-3.5
                    border-b border-white/[0.04] last:border-0 transition-colors
                    animate-fade-up
                    ${isMe ? 'bg-[rgba(200,168,130,0.04)] ring-1 ring-inset ring-[rgba(200,168,130,0.12)]' : 'hover:bg-white/[0.02]'}`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Rank — medal emoji for top 3, number for the rest; fades after position 10 */}
                  <div className="flex items-center justify-center">
                    {isTop3 ? (
                      <span className="text-base leading-none">{MEDALS[i]}</span>
                    ) : (
                      <span className={`text-sm font-mono font-bold tabular-nums ${i < 10 ? 'text-[#7a6e60]' : 'text-[#3a3028]'}`}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Player — avatar (photo or initial), name, optional title badge */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {player.photoURL ? (
                      <img
                        src={player.photoURL}
                        alt={player.displayName}
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 rounded-full flex-shrink-0 ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-[#1e1a16] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#7a6e60]">
                        {initial}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className={`text-sm font-medium truncate leading-none ${isMe ? 'text-[#c8a882]' : 'text-[#ede8df]'}`}>
                        {player.displayName}
                        {/* "you" label makes it easy to spot your own row */}
                        {isMe && <span className="ml-1.5 text-[10px] text-[#7a6e60] font-normal">you</span>}
                      </span>
                      {player.title && <TitleBadge titleId={player.title} size="sm" />}
                    </div>
                  </div>

                  {/* Wins — teal accent to reinforce the "W" column header colour */}
                  <span className="text-center text-sm font-bold font-mono tabular-nums text-[#5a8a88]">
                    {player.gamesWon}
                  </span>

                  {/* Losses */}
                  <span className="text-center text-sm font-mono tabular-nums text-[#7a6e60]">
                    {player.gamesLost}
                  </span>

                  {/* Win rate percentage */}
                  <span className="text-center text-sm font-mono tabular-nums text-[#ede8df]">
                    {winRate}
                  </span>

                  {/* Coin balance */}
                  <span className="text-center text-sm font-mono tabular-nums text-[#c8a882]">
                    {player.coins}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
