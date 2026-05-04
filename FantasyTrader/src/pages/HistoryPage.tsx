/**
 * HistoryPage.tsx
 *
 * This is the game history page — it shows a list of all the completed draft games
 * that the current user has played, sorted from most recent to oldest.
 *
 * For each game it shows:
 * - Whether the user won, lost, or tied (colored badge)
 * - How long the game was (1 hour, 1 day, 1 week)
 * - The date the game ended
 * - The user's portfolio gain % vs their opponent's
 * - All the stocks the user picked in that game
 *
 * We have to query Firestore twice — once for games where the user was the host,
 * and once for games where they were the guest — then merge and deduplicate the results.
 * This is because Firestore doesn't support OR queries across different fields natively.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatSignedPercent } from '../utils/formatters';
import type { Room } from '../types';

/**
 * Maps the raw duration string stored in Firestore to a human-readable label.
 * Firestore stores things like '1h', '1d', '1w' but we want to show 'time Hour/Day/Week'.
 */
const durationLabels: Record<string, string> = { '1h': '1 Hour', '1d': '1 Day', '1w': '1 Week' };

/**
 * formatDate - converts a Unix timestamp (in ms) to a readable date string.
 *
 * Returns something like "Jan 5, 2025". Returns '—' if the timestamp is null,
 * which can happen if the game ended unexpectedly and endTime wasn't written.
 *
 * @param ts - Unix timestamp in milliseconds, or null
 * @returns Formatted date string or '—'
 */
function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * HistoryPage component
 *
 * Fetches all completed games for the current user on mount, then renders
 * them as a list of cards sorted by most recent first.
 *
 * If the user hasn't played any games yet, shows an empty state message.
 * While the data is loading from Firestore, shows a full-screen spinner.
 */
export default function HistoryPage() {
  /** The currently logged-in user — we need their UID to query their games. */
  const user = useAuthStore(s => s.user);

  /** The list of completed rooms (games) this user was part of. */
  const [games, setGames] = useState<Room[]>([]);

  /** Whether we're still waiting for the Firestore queries to finish. */
  const [loading, setLoading] = useState(true);

  /**
   * Fetch game history from Firestore on mount (or when the user changes).
   *
   * We run two parallel queries:
   * 1. Rooms where the user was the host
   * 2. Rooms where the user was the guest
   *
   * Both queries only return rooms with status == 'completed' so we don't
   * show in-progress or waiting games in the history.
   *
   * We use a Set to deduplicate in case the same room somehow shows up
   * in both queries (shouldn't happen but good to be safe).
   *
   * After merging, we sort by endTime descending so the most recent games
   * appear at the top of the list.
   */
  useEffect(() => {
    if (!user || !db) return;
    async function fetchHistory() {
      if (!db || !user) return;

      // Run both queries at the same time with Promise.all for efficiency
      const [asHost, asGuest] = await Promise.all([
        getDocs(query(collection(db, 'rooms'), where('hostId', '==', user.uid), where('status', '==', 'completed'))),
        getDocs(query(collection(db, 'rooms'), where('guestId', '==', user.uid), where('status', '==', 'completed'))),
      ]);

      // Merge and deduplicate results using a Set of room IDs
      const seen = new Set<string>();
      const all: Room[] = [];
      for (const snap of [...asHost.docs, ...asGuest.docs]) {
        if (!seen.has(snap.id)) {
          seen.add(snap.id);
          all.push(snap.data() as Room);
        }
      }

      // Sort most recent games first
      all.sort((a, b) => (b.endTime ?? 0) - (a.endTime ?? 0));

      setGames(all);
      setLoading(false);
    }
    fetchHistory();
  }, [user]);

  // Show full-screen spinner while Firestore is loading
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="pt-20 min-h-screen bg-zinc-950 px-4 pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-zinc-100 text-2xl font-bold">Game History</h1>

        {/*
          Empty state — shown when the user hasn't completed any games yet.
          Gives them a helpful nudge to go play a game.
        */}
        {games.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400">No completed games yet.</p>
            <p className="text-zinc-600 text-sm mt-1">Finish a draft game to see your results here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map(room => {
              /**
               * Figure out if the current user was the host or guest in this game.
               * This determines which gain% and picks to show as "yours" vs "opponent's".
               */
              const isHost = room.hostId === user?.uid;

              /** The current user's final portfolio gain % for this game. */
              const myGain = isHost ? room.hostGainPercent : room.guestGainPercent;

              /** The opponent's final portfolio gain % for this game. */
              const oppGain = isHost ? room.guestGainPercent : room.hostGainPercent;

              /** Whether the current user won this game. */
              const won = room.winnerId === user?.uid;

              /**
               * Whether this game ended in a tie.
               * A tie is when there's no winner ID stored in Firestore.
               */
              const tied = !room.winnerId;

              /** The stocks the current user picked in this game. */
              const myPicks = room.picks.filter(p => p.userId === user?.uid);

              /** Label text for the result badge: Win, Loss, or Tie. */
              const resultLabel = tied ? 'Tie' : won ? 'Win' : 'Loss';

              /**
               * Tailwind classes for the result badge color.
               * Green for wins, red for losses, gray for ties.
               */
              const resultColor = tied
                ? 'text-zinc-400 bg-zinc-800'
                : won
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-red-400 bg-red-500/10';

              return (
                <div key={room.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">

                  {/*
                    Top row — shows the result badge (Win/Loss/Tie),
                    the game duration (1 Hour, 1 Day, etc.), and the end date.
                  */}
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

                  {/*
                    Gain row — shows the user's portfolio gain % on the left
                    and the opponent's on the right. Green if positive, red if negative.
                    Shows '—' if the gain wasn't recorded (shouldn't happen normally).
                  */}
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

                  {/*
                    Picks section — shows all the stocks the user picked as little
                    ticker chips. Only renders if there are picks to show.
                  */}
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