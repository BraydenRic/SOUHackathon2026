/**
 * GamePage.tsx
 *
 * This is the live game page — the one players are on while their draft portfolios
 * are actually competing against each other in real time. After the draft is done
 * and the host clicks "Start Game", both players land here and watch their portfolio
 * gains update live as stock prices move.
 *
 * The page shows a leaderboard at the top with both players' current portfolio gain %,
 * a breakdown of each player's individual stock picks and how they're performing,
 * and a countdown timer showing how much time is left in the competition.
 *
 * When the timer hits zero, the host's client is responsible for writing the final
 * result to Firestore (determining the winner, recording gains, etc.). Both clients
 * then pick up the 'completed' status from Firestore and show the winner modal.
 *
 * We use a couple of refs (completedRef, recordedRef) to make sure we don't
 * accidentally write to Firestore twice — since effects can fire multiple times
 * in React, these act as one-time flags.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { STOCK_POOL } from '../lib/finnhub';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useRoom } from '../hooks/useRoom';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { formatSignedPercent, formatCountdown } from '../utils/formatters';
import { determineWinner, calcDraftPortfolioGain } from '../utils/calculations';
import type { DraftPick } from '../types';

/** All stock symbols from the pool, used to subscribe to live price updates. */
const SYMBOLS = STOCK_POOL.map(s => s.symbol);

/**
 * GamePage component
 *
 * Handles the entire live game experience:
 * - Subscribes to live stock prices and recalculates portfolio gains in real time
 * - Runs a countdown timer that checks every second if the game has ended
 * - When time runs out, the host writes the final result to Firestore
 * - Both players see the winner modal once the room status flips to 'completed'
 * - Each player records their own win/loss result and coin reward once per game
 */
export default function GamePage() {
  /** Room ID from the URL, e.g. /game/:roomId */
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  /** The currently logged-in user. */
  const user = useAuthStore(s => s.user);

  /**
   * completeGame — writes the final result to Firestore (only called by the host)
   * recordMyResult — each player calls this once to update their own stats and coins
   */
  const { completeGame, recordMyResult } = useGameStore();

  /**
   * Refreshes the user's local state from Firestore after the game ends,
   * so their coin balance and win/loss record update immediately in the UI.
   */
  const refreshUser = useAuthStore(s => s.refreshUser);

  /**
   * Live room data from Firestore.
   * We listen to this to know when the game ends (status flips to 'completed')
   * and to get the winner ID and coin reward.
   */
  const { room, loading } = useRoom(roomId ?? '');

  /**
   * Live stock prices for every symbol in the pool.
   * These update frequently and drive the real-time portfolio gain calculations.
   */
  const { prices } = useStockPrices(SYMBOLS);

  /** Formatted countdown string like "1:23:45" shown in the header. */
  const [countdown, setCountdown] = useState('');

  /** Controls whether the winner modal is visible. */
  const [showWinner, setShowWinner] = useState(false);

  /**
   * Ref flag to make sure we only call completeGame() once.
   * Without this, the interval could call it on every tick after the game ends
   * since the effect runs repeatedly.
   */
  const completedRef = useRef(false);

  /**
   * Ref flag to make sure each player only records their result once.
   * The effect watching room.status could fire multiple times so this
   * prevents duplicate Firestore writes to the user's stats.
   */
  const recordedRef = useRef(false);

  /** Quick lookup map from stock symbol to its metadata (name, sector, etc.) */
  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));

  /** All picks made by the host during the draft. */
  const hostPicks: DraftPick[] = room?.picks.filter(p => p.userId === room.hostId) ?? [];

  /** All picks made by the guest during the draft. */
  const guestPicks: DraftPick[] = room?.picks.filter(p => p.userId === room.guestId) ?? [];

  /**
   * Calculated portfolio stats for both players.
   * usePortfolio takes the draft picks and current prices and gives back
   * the overall gain% and per-pick breakdown for each player.
   */
  const { host, guest } = usePortfolio(hostPicks, guestPicks, prices);

  /** Whether the current user is the host of this room. */
  const isHost = room?.hostId === user?.uid;

  /** This player's portfolio stats (gain%, individual picks). */
  const myPicks = isHost ? host : guest;

  /** The opponent's portfolio stats. */
  const opponentPicks = isHost ? guest : host;

  /** Display name for the current user. */
  const myName = user?.displayName ?? 'You';

  /** Display name for the opponent — just "Opponent" for now. */
  const opponentName = isHost ? 'Opponent' : 'Opponent';

  /**
   * checkEnd — checks if the game timer has expired and handles game completion.
   *
   * This gets called every second by the countdown interval.
   * If we're past the endTime AND the game hasn't been completed yet:
   * - The host is the one responsible for writing the result to Firestore.
   *   We only have one player do it to avoid race conditions / duplicate writes.
   * - The host calculates the winner, saves gains, then calls completeGame().
   * - Both players show the winner modal regardless of who triggered completion.
   *
   * We wrap this in useCallback so the interval effect doesn't re-register
   * every render — it only updates when the relevant dependencies change.
   */
  const checkEnd = useCallback(async () => {
    if (!room || !roomId || completedRef.current) return;

    // If Firestore already marked it completed (e.g. from the other client), just show the modal
    if (room.status === 'completed') { setShowWinner(true); return; }
    if (!room.endTime) return;

    if (Date.now() >= room.endTime) {
      completedRef.current = true; // Set this immediately so we don't run this block twice

      // Only the host writes the final result to avoid both clients writing at the same time
      if (room.hostId === user?.uid) {
        const winner = determineWinner(hostPicks, guestPicks, prices);
        const winnerId = winner === 'tie' ? null : winner === 'host' ? room.hostId : (room.guestId ?? null);
        const hostGain = calcDraftPortfolioGain(hostPicks, prices);
        const guestGain = calcDraftPortfolioGain(guestPicks, prices);
        await completeGame(roomId, winnerId, hostGain, guestGain);
      }

      setShowWinner(true);
    }
  }, [room, roomId, hostPicks, guestPicks, prices, completeGame, user]);

  /**
   * Countdown timer effect.
   *
   * Sets up a 1-second interval that:
   * 1. Updates the formatted countdown string shown in the header
   * 2. Calls checkEnd() to see if the game is over
   *
   * Runs once when endTime is available, and cleans up the interval on unmount
   * or when endTime/checkEnd changes.
   */
  useEffect(() => {
    if (!room?.endTime || room.status === 'completed') return;
    const tick = setInterval(() => {
      setCountdown(formatCountdown(room.endTime!));
      checkEnd();
    }, 1000);
    setCountdown(formatCountdown(room.endTime)); // Set immediately so there's no blank flash
    return () => clearInterval(tick);
  }, [room?.endTime, room?.status, checkEnd]);

  /**
   * Result recording effect.
   *
   * Fires when the room status flips to 'completed' in Firestore.
   * Each player (both host and guest) records their own result exactly once
   * using the recordedRef flag to prevent duplicate calls.
   *
   * After recording, we refresh the user's local data so their coin balance
   * and stats are up to date in the navbar and profile without needing a page reload.
   */
  useEffect(() => {
    if (room?.status !== 'completed' || !user || recordedRef.current) return;
    recordedRef.current = true;
    recordMyResult(user.uid, room.id, room.winnerId, room.coinReward).then(() => refreshUser());
    setShowWinner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  /**
   * Safety redirect effect.
   *
   * If somehow a player ends up on the game page but the room is still in 'waiting'
   * status (shouldn't really happen in normal flow), redirect them back to the lobby.
   */
  useEffect(() => {
    if (!loading && room && room.status === 'waiting') navigate('/lobby');
  }, [loading, room, navigate]);

  // Show spinner while room data is loading from Firestore
  if (loading || !room) return <LoadingSpinner fullScreen />;

  /** The UID of the winning player, or null if it's a tie. */
  const winner = room.winnerId;

  /** Whether the current user won. */
  const isWinner = winner === user?.uid;

  /**
   * Whether the game ended in a tie.
   * A tie happens when there's no winner ID, or both players somehow have the same UID
   * (shouldn't happen in practice but it's a safe fallback).
   */
  const isTie = !winner || (room.hostId === winner && room.guestId === winner);

  /**
   * PickRow component — renders a single stock pick with its current gain/loss.
   *
   * Defined inside GamePage so it has access to the prices and stockBySymbol
   * lookups without needing to pass them as props every time.
   *
   * @param pick - The draft pick object containing symbol, draftPrice, etc.
   */
  function PickRow({ pick }: { pick: DraftPick }) {
    // Use current live price, fall back to draft price if price hasn't loaded yet
    const current = prices[pick.symbol]?.price ?? pick.draftPrice;

    // Calculate gain % from the price when it was drafted to the current price
    const gain = pick.draftPrice ? ((current - pick.draftPrice) / pick.draftPrice) * 100 : 0;

    const stock = stockBySymbol[pick.symbol];

    return (
      <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
        <div>
          <p className="font-mono font-bold text-zinc-100 text-sm">{pick.symbol}</p>
          <p className="text-zinc-500 text-xs">{stock?.name}</p>
        </div>
        <span className={`text-sm font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatSignedPercent(gain, 4)}
        </span>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-zinc-950 px-4 pb-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Page header — shows game title and countdown timer */}
  const isTie = winner === null;

  const leading = myPicks.gainPercent > opponentPicks.gainPercent;
  const tied = myPicks.gainPercent === opponentPicks.gainPercent;

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 pb-8">
      <div className="max-w-4xl mx-auto space-y-5 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Live Game</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff4560]"
                style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
              />
              <p className="text-[#7a6e60] text-sm capitalize">{room.duration} competition</p>
            </div>
          </div>
          {countdown && (
            <div className="text-right bg-[#161311] border border-white/[0.07] rounded-xl px-4 py-2.5">
              <p className="text-[#7a6e60] text-[11px] uppercase tracking-widest mb-0.5">Time remaining</p>
              <p className="text-[#ede8df] font-mono font-black text-xl tabular-nums">{countdown}</p>
            </div>
          )}
        </div>

        {/*
          Live leaderboard — two cards side by side showing each player's
          overall portfolio gain % in real time. The current user's card
          is highlighted in green, opponent is in blue/neutral.
        */}
        {/* Score cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* My score */}
          <div className={`rounded-2xl p-6 border ${leading && !tied ? 'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.04)]' : 'border-white/[0.07] bg-[#161311]'}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#ede8df] text-sm font-semibold">{myName}</p>
              {leading && !tied && (
                <span className="text-[10px] font-semibold text-[#22c55e] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] px-2 py-0.5 rounded-full">Leading</span>
              )}
            </div>
            <p className={`font-mono font-bold text-3xl sm:text-5xl tabular-nums tracking-tight ${myPicks.gainPercent >= 0 ? 'text-[#22c55e]' : 'text-[#ff4560]'}`}
              style={{ textShadow: myPicks.gainPercent >= 0 ? '0 0 40px rgba(34,197,94,0.3)' : '0 0 40px rgba(255,69,96,0.3)' }}
            >
              {formatSignedPercent(myPicks.gainPercent, 4)}
            </p>
            <p className="text-[#7a6e60] text-xs mt-2">portfolio gain</p>
          </div>

          {/* Opponent score */}
          <div className={`rounded-2xl p-6 border ${!leading && !tied ? 'border-[rgba(90,138,136,0.25)] bg-[rgba(90,138,136,0.05)]' : 'border-white/[0.07] bg-[#161311]'}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#5a8a88] text-sm font-semibold">Opponent</p>
              {!leading && !tied && (
                <span className="text-[10px] font-semibold text-[#5a8a88] bg-[rgba(90,138,136,0.1)] border border-[rgba(90,138,136,0.2)] px-2 py-0.5 rounded-full">Leading</span>
              )}
            </div>
            <p className={`font-mono font-bold text-3xl sm:text-5xl tabular-nums tracking-tight ${opponentPicks.gainPercent >= 0 ? 'text-[#22c55e]' : 'text-[#ff4560]'}`}
              style={{ textShadow: opponentPicks.gainPercent >= 0 ? '0 0 40px rgba(34,197,94,0.2)' : '0 0 40px rgba(255,69,96,0.2)' }}
            >
              {formatSignedPercent(opponentPicks.gainPercent, 4)}
            </p>
            <p className="text-[#7a6e60] text-xs mt-2">portfolio gain</p>
          </div>
        </div>

        {/*
          Per-pick breakdown — shows each player's individual stocks
          and how much each one has gained or lost since it was drafted.
          Uses the PickRow component defined above.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: myName, picks: myPicks.picks, color: '#c8a882' },
            { name: 'Opponent', picks: opponentPicks.picks, color: '#5a8a88' },
          ].map(({ name, picks, color }) => (
            <div key={name} className="bg-[#161311] border border-white/[0.07] rounded-2xl p-5">
              <p className="text-sm font-semibold mb-4" style={{ color }}>{name}'s picks</p>
              {picks.length === 0 ? (
                <p className="text-[#7a6e60] text-sm">No picks</p>
              ) : (
                <div className="space-y-1">
                  {picks.map(pick => {
                    const current = prices[pick.symbol]?.price ?? pick.draftPrice;
                    const gain = pick.draftPrice ? ((current - pick.draftPrice) / pick.draftPrice) * 100 : 0;
                    const stock = stockBySymbol[pick.symbol];
                    return (
                      <div key={pick.symbol} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                        <div>
                          <p className="font-mono font-black text-[#ede8df] text-sm">{pick.symbol}</p>
                          <p className="text-[#7a6e60] text-[11px]">{stock?.name}</p>
                        </div>
                        <span className={`text-sm font-semibold font-mono tabular-nums ${gain >= 0 ? 'text-[#22c55e]' : 'text-[#ff4560]'}`}>
                          {formatSignedPercent(gain, 4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/*
        Winner modal — pops up when the game ends (showWinner = true).
        Shows a trophy, handshake, or sad face depending on the result,
        the final portfolio gains for both players, and a "Play Again" button
        that sends the user back to the lobby.

        Clicking outside the modal (on the dark backdrop) closes it,
        but the result is already saved to Firestore so it doesn't matter.
      */}
      {showWinner && (
        <div
          className="fixed inset-0 bg-[#0a0908]/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowWinner(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 max-w-sm w-full text-center space-y-4"
            onClick={e => e.stopPropagation()} // Prevent clicks inside the modal from closing it
            className="bg-[#161311] border border-white/[0.1] rounded-3xl p-8 max-w-sm w-full text-center space-y-5 animate-scale-in shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto text-3xl
              ${isTie ? 'bg-[rgba(200,168,130,0.1)] border border-[rgba(200,168,130,0.2)]' :
                isWinner ? 'bg-[rgba(200,168,130,0.1)] border border-[rgba(200,168,130,0.2)]' :
                'bg-[rgba(255,69,96,0.1)] border border-[rgba(255,69,96,0.2)]'}`}
            >
              {isTie ? '🤝' : isWinner ? '🏆' : '📉'}
            </div>

            <div>
              <h2 className={`font-heading font-extrabold text-3xl tracking-tight ${
                isTie ? 'text-[#c8a882]' : isWinner ? 'text-[#c8a882]' : 'text-[#ede8df]'
              }`}>
                {isTie ? "It's a tie" : isWinner ? 'You won' : 'You lost'}
              </h2>
              {isWinner && !isTie && (
                <p className="text-[#c8a882] text-sm mt-1">+50 ◈ coins earned</p>
              )}
            </div>

            <div className="bg-[#100e0c] rounded-xl p-4 space-y-2">
              {[
                { label: 'Your gain', val: myPicks.gainPercent, isMe: true },
                { label: "Opponent's gain", val: opponentPicks.gainPercent, isMe: false },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[#7a6e60]">{label}</span>
                  <span className={`font-mono font-bold tabular-nums ${val >= 0 ? 'text-[#22c55e]' : 'text-[#ff4560]'}`}>
                    {formatSignedPercent(val)}
                  </span>
                </div>
              ))}
            </div>

            <Button variant="primary" className="w-full" onClick={() => navigate('/lobby')}>
              Play Again
            </Button>
            <button
              onClick={() => setShowWinner(false)}
              className="text-[#7a6e60] text-sm hover:text-[#ede8df] transition-colors cursor-pointer"
            >
              View live board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
