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
const durationLabels: Record<string, string> = { '1m': '1 Min', '1h': '1 Hour', '1d': '1 Day', '1w': '1 Week' };

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
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 pb-8">
      <div className="max-w-3xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">History</h1>
          <p className="text-[#7a6e60] text-sm mt-1">Your completed draft games</p>
        </div>

        {/*
          Empty state — shown when the user hasn't completed any games yet.
          Gives them a helpful nudge to go play a game.
        */}
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
          <div className="space-y-4">
            {games.map(room => {
              /**
               * Figure out if the current user was the host or guest in this game.
               * This determines which gain% and picks to show as "yours" vs "opponent's".
               */
          <div className="space-y-3">
            {games.map((room, i) => {
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
              const result = tied ? 'Tie' : won ? 'Win' : 'Loss';

              return (
                <div
                  key={room.id}
                  className="bg-[#161311] border border-white/[0.07] rounded-2xl p-5 space-y-4 animate-fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Top row */}
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

                  {/*
                    Gain row — shows the user's portfolio gain % on the left
                    and the opponent's on the right. Green if positive, red if negative.
                    Shows '—' if the gain wasn't recorded (shouldn't happen normally).
                  */}
                  {/* Gains */}
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
                          {val === undefined ? '—' : formatSignedPercent(val, 4)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/*
                    Picks section — shows all the stocks the user picked as little
                    ticker chips. Only renders if there are picks to show.
                  */}
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
