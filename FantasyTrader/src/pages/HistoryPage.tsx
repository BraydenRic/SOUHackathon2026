// Game history — list of the current user's completed games

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatSignedPercent } from '../utils/formatters';
import type { Room } from '../types';

const durationLabels: Record<string, string> = { '1h': '1 Hour', '1d': '1 Day', '1w': '1 Week' };

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryPage() {
  const user = useAuthStore(s => s.user);
  const [games, setGames] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    async function fetchHistory() {
      if (!db || !user) return;
      const [asHost, asGuest] = await Promise.all([
        getDocs(query(collection(db, 'rooms'), where('hostId', '==', user.uid), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'rooms'), where('guestId', '==', user.uid), where('status', '==', 'completed'))),
      ]);
      const seen = new Set<string>();
      const all: Room[] = [];
      for (const snap of [...asHost.docs, ...asGuest.docs]) {
        if (!seen.has(snap.id)) {
          seen.add(snap.id);
          all.push(snap.data() as Room);
        }
      }
      all.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));
      setGames(all);
      setLoading(false);
    }
    fetchHistory();
  }, [user]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="pt-20 min-h-screen bg-zinc-950 px-4 pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-zinc-100 text-2xl font-bold">Game History</h1>

        {games.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400">No completed games yet.</p>
            <p className="text-zinc-600 text-sm mt-1">Finish a draft game to see your results here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map(room => {
              const isHost = room.hostId === user?.uid;
              const myGain = isHost ? room.hostGainPercent : room.guestGainPercent;
              const oppGain = isHost ? room.guestGainPercent : room.hostGainPercent;
              const won = room.winnerId === user?.uid;
              const tied = !room.winnerId;
              const myPicks = room.picks.filter(p => p.userId === user?.uid);

              const resultLabel = tied ? 'Tie' : won ? 'Win' : 'Loss';
              const resultColor = tied
                ? 'text-zinc-400 bg-zinc-800'
                : won
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-red-400 bg-red-500/10';

              return (
                <div key={room.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${resultColor}`}>
                        {resultLabel}
                      </span>
                      <span className="text-zinc-500 text-xs bg-zinc-800 px-2.5 py-1 rounded-full">
                        {durationLabels[room.duration] ?? room.duration}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs">{formatDate(room.endTime)}</p>
                  </div>

                  {/* Gain row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-500 text-xs mb-0.5">Your gain</p>
                      <p className={`font-mono font-bold text-lg ${myGain === undefined ? 'text-zinc-600' : myGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {myGain === undefined ? '—' : formatSignedPercent(myGain, 4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs mb-0.5">Opponent's gain</p>
                      <p className={`font-mono font-bold text-lg ${oppGain === undefined ? 'text-zinc-600' : oppGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {oppGain === undefined ? '—' : formatSignedPercent(oppGain, 4)}
                      </p>
                    </div>
                  </div>

                  {/* Picks */}
                  {myPicks.length > 0 && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-2">Your picks</p>
                      <div className="flex flex-wrap gap-2">
                        {myPicks.map(p => (
                          <span key={p.symbol} className="text-xs font-mono font-semibold text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-lg">
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