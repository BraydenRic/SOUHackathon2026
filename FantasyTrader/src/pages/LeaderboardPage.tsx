/**
 * LeaderboardPage.tsx
 *
 * This is the global leaderboard page — it shows the top 50 players in the app
 * ranked by how many games they've won. It's basically the hall of fame for the
 * best draft players on the platform.
 *
 * For each player it shows:
 * - Their rank number (with gold/silver/bronze colors for top 3)
 * - Their avatar (Google profile pic or a fallback initial)
 * - Their display name (highlighted in green if it's the current user)
 * - Total wins, losses, win rate %, and coin balance
 *
 * The current user's row is highlighted with a subtle green tint so they can
 * quickly find themselves in the list without having to scan through everyone.
 *
 * We fetch the leaderboard once on mount — it's not real-time since rankings
 * don't need to update every second, a one-time fetch on page load is fine.
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TitleBadge } from '../components/ui/TitleBadge';
import type { User } from '../types';

/**
 * LeaderboardPage component
 *
 * Fetches the top 50 players sorted by gamesWon from Firestore on mount,
 * then renders them in a ranked table. Shows a loading spinner while fetching
 * and an empty state if no players have completed any games yet.
 */
const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  /** The currently logged-in user — used to highlight the current user's row. */
  const currentUser = useAuthStore(s => s.user);

  /** The list of top players fetched from Firestore, sorted by wins descending. */
  const [players, setPlayers] = useState<User[]>([]);

  /** Whether we're still waiting for the Firestore query to complete. */
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the leaderboard from Firestore on mount.
   *
   * Queries the 'users' collection ordered by gamesWon descending,
   * limited to the top 50 players. We cap it at 50 to keep the page
   * from getting too long and to avoid reading too many documents.
   *
   * No dependency array item other than [] since we only want this
   * to run once when the page loads — the leaderboard doesn't need
   * to be real-time like the game page does.
   */
  useEffect(() => {
    if (!db) return;
    async function fetchLeaderboard() {
      if (!db) return;
      const snap = await getDocs(
        query(collection(db, 'users'), orderBy('gamesWon', 'desc'), limit(50))
      );
      setPlayers(snap.docs.map(d => d.data() as User).filter(p => p.gamesPlayed > 0));
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  // Show a full-screen spinner while we're waiting on Firestore
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 pb-8">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Leaderboard</h1>
          <p className="text-[#7a6e60] text-sm mt-1">Top traders by wins</p>
        </div>

        {/*
          Empty state — shown when no players have finished any games yet.
          This will show up on a fresh deployment before anyone has played.
        */}
        {players.length === 0 ? (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-12 text-center">
            <p className="text-[#ede8df] font-medium">No players yet</p>
            <p className="text-[#7a6e60] text-sm mt-1">Complete a game to appear here</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

            {/*
              Table header row — labels for each column.
              Uses a CSS grid with fixed column widths to keep everything aligned.
              The rank column is 3rem, player name takes the remaining space,
              and the stat columns are fixed widths.
            */}
            <div className="grid grid-cols-[3rem_1fr_4rem_4rem_5rem_4rem] gap-2 px-4 py-2.5 border-b border-zinc-800 text-zinc-500 text-xs font-medium uppercase tracking-wide">
              <span className="text-center">#</span>
              <span>Player</span>
              <span className="text-center">Wins</span>
              <span className="text-center">Losses</span>
              <span className="text-center">Win Rate</span>
              <span className="text-center">Coins</span>
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_4.5rem_3.5rem] gap-2 px-4 py-3 border-b border-white/[0.06]">
              {['#', 'Player', 'W', 'L', 'Win%', '◈'].map((h, i) => (
                <span key={h} className={`text-[11px] font-medium uppercase tracking-widest ${i === 0 || i >= 2 ? 'text-center' : ''} ${h === 'W' ? 'text-[#5a8a88]' : 'text-[#7a6e60]'}`}>
                  {h}
                </span>
              ))}
            </div>

            {players.map((player, i) => {
              /** Whether this row belongs to the currently logged-in user. */
              const isMe = player.uid === currentUser?.uid;

              /**
               * Calculate win rate as a percentage string.
               * If they haven't played any games yet, show '—' instead of 0%
               * to avoid showing a misleading "0%" for brand new players.
               */
              const winRate = player.gamesPlayed > 0
                ? `${((player.gamesWon / player.gamesPlayed) * 100).toFixed(0)}%`
                : '—';

              /**
               * Fallback initial for players without a profile photo.
               * Takes the first letter of their display name, uppercased.
               * Defaults to '?' if they somehow don't have a display name.
               */
              const initial = player.displayName?.[0]?.toUpperCase() ?? '?';
              const isTop3 = i < 3;

              return (
                <div
                  key={player.uid}
                  className={`grid grid-cols-[3rem_1fr_4rem_4rem_5rem_4rem] gap-2 items-center px-4 py-3 border-b border-zinc-800/60 last:border-0 ${
                    // Highlight the current user's row in green, hover effect for everyone else
                    isMe ? 'bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/20' : 'hover:bg-zinc-800/40'
                  }`}
                >
                  {/*
                    Rank number — gold for 1st, silver for 2nd, bronze for 3rd,
                    and a muted gray for everyone else. Makes the podium spots
                    stand out at a glance.
                  */}
                  <span className={`text-center text-sm font-bold ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-zinc-300' :
                    i === 2 ? 'text-amber-600' :
                    'text-zinc-600'
                  }`}>
                    {i + 1}
                  </span>

                  {/*
                    Player avatar + display name.
                    If they have a Google profile photo, show that.
                    Otherwise show a circle with their first initial.
                    referrerPolicy="no-referrer" is needed for Google profile
                    photos to load correctly across origins.
                    The current user's name is highlighted in emerald with a "you" tag.
                  */}
                  className={`grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_4.5rem_3.5rem] gap-2 items-center px-4 py-3.5
                    border-b border-white/[0.04] last:border-0 transition-colors
                    animate-fade-up
                    ${isMe ? 'bg-[rgba(200,168,130,0.04)] ring-1 ring-inset ring-[rgba(200,168,130,0.12)]' : 'hover:bg-white/[0.02]'}`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center">
                    {isTop3 ? (
                      <span className="text-base leading-none">{MEDALS[i]}</span>
                    ) : (
                      <span className={`text-sm font-mono font-bold tabular-nums ${i < 10 ? 'text-[#7a6e60]' : 'text-[#3a3028]'}`}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {player.photoURL ? (
                      <img
                        src={player.photoURL}
                        alt={player.displayName}
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 rounded-full flex-shrink-0"
                        className="h-7 w-7 rounded-full flex-shrink-0 ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-[#1e1a16] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#7a6e60]">
                        {initial}
                      </div>
                    )}
                    <span className={`text-sm font-medium truncate ${isMe ? 'text-emerald-300' : 'text-zinc-200'}`}>
                      {player.displayName}
                      {/* Small "you" label so the current user can find themselves instantly */}
                      {isMe && <span className="ml-1.5 text-xs text-emerald-500 font-normal">you</span>}
                    </span>
                  </div>

                  {/* Total wins — shown in emerald green since it's the main ranking stat */}
                  <span className="text-center text-sm font-semibold text-emerald-400">{player.gamesWon}</span>

                  {/* Total losses */}
                  <span className="text-center text-sm text-zinc-400">{player.gamesLost}</span>

                  {/*
                    Win rate — calculated above as a percentage string.
                    Uses monospace font so the numbers line up cleanly in the column.
                  */}
                  <span className="text-center text-sm text-zinc-300 font-mono">{winRate}</span>

                  {/*
                    Coin balance — shown in yellow to match the coin/currency theme.
                    Monospace font keeps the numbers aligned.
                  */}
                  <span className="text-center text-sm text-yellow-400 font-mono">{player.coins}</span>
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className={`text-sm font-medium truncate leading-none ${isMe ? 'text-[#c8a882]' : 'text-[#ede8df]'}`}>
                        {player.displayName}
                        {isMe && <span className="ml-1.5 text-[10px] text-[#7a6e60] font-normal">you</span>}
                      </span>
                      {player.title && <TitleBadge titleId={player.title} size="sm" />}
                    </div>
                  </div>

                  {/* Wins */}
                  <span className="text-center text-sm font-bold font-mono tabular-nums text-[#5a8a88]">
                    {player.gamesWon}
                  </span>

                  {/* Losses */}
                  <span className="text-center text-sm font-mono tabular-nums text-[#7a6e60]">
                    {player.gamesLost}
                  </span>

                  {/* Win rate */}
                  <span className="text-center text-sm font-mono tabular-nums text-[#ede8df]">
                    {winRate}
                  </span>

                  {/* Coins */}
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
