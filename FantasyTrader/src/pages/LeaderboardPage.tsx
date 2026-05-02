import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TitleBadge } from '../components/ui/TitleBadge';
import type { User } from '../types';

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
      setPlayers(snap.docs.map(d => d.data() as User));
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="pt-14 min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-zinc-100 text-2xl font-bold">Leaderboard</h1>

        {players.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400">No players yet.</p>
            <p className="text-zinc-600 text-sm mt-1">Complete a game to appear here.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[3rem_1fr_4rem_4rem_5rem_4rem] gap-2 px-4 py-2.5 border-b border-zinc-800 text-zinc-500 text-xs font-medium uppercase tracking-wide">
              <span className="text-center">#</span>
              <span>Player</span>
              <span className="text-center">Wins</span>
              <span className="text-center">Losses</span>
              <span className="text-center">Win Rate</span>
              <span className="text-center">Coins</span>
            </div>

            {players.map((player, i) => {
              const isMe = player.uid === currentUser?.uid;
              const winRate = player.gamesPlayed > 0
                ? `${((player.gamesWon / player.gamesPlayed) * 100).toFixed(0)}%`
                : '—';
              const initial = player.displayName?.[0]?.toUpperCase() ?? '?';

              return (
                <div
                  key={player.uid}
                  className={`grid grid-cols-[3rem_1fr_4rem_4rem_5rem_4rem] gap-2 items-center px-4 py-3 border-b border-zinc-800/60 last:border-0 ${
                    isMe ? 'bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/20' : 'hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Rank */}
                  <span className={`text-center text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>
                    {i + 1}
                  </span>

                  {/* Avatar + name + title */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {player.photoURL ? (
                      <img src={player.photoURL} alt={player.displayName} referrerPolicy="no-referrer" className="h-7 w-7 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-zinc-300">
                        {initial}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-medium truncate ${isMe ? 'text-emerald-300' : 'text-zinc-200'}`}>
                        {player.displayName}
                        {isMe && <span className="ml-1.5 text-xs text-emerald-500 font-normal">you</span>}
                      </span>
                      {player.title && <TitleBadge titleId={player.title} size="sm" />}
                    </div>
                  </div>

                  {/* Wins */}
                  <span className="text-center text-sm font-semibold text-emerald-400">{player.gamesWon}</span>

                  {/* Losses */}
                  <span className="text-center text-sm text-zinc-400">{player.gamesLost}</span>

                  {/* Win rate */}
                  <span className="text-center text-sm text-zinc-300 font-mono">{winRate}</span>

                  {/* Coins */}
                  <span className="text-center text-sm text-yellow-400 font-mono">{player.coins}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
