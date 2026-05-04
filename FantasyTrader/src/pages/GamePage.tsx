// Game page — live 1v1 portfolio comparison during an active match; handles game-end detection,
// winner resolution, and coin reward recording (guarded by refs to prevent double-firing)

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

const SYMBOLS = STOCK_POOL.map(s => s.symbol);

/**
 * GamePage — the live match view, shown to both players during an active game.
 *
 * Responsibilities:
 *   1. Countdown timer that ticks every second and triggers game-end logic when it reaches 0
 *   2. Game-end detection: only the host calls `completeGame` (writes winnerId + gains to Firestore)
 *      to avoid a race condition where both clients try to resolve the winner simultaneously
 *   3. Winner modal: appears for both players once the room status becomes 'completed',
 *      driven by the real-time Firestore listener in `useRoom`
 *   4. Coin recording: `recordMyResult` runs once per client (guarded by `recordedRef`) when
 *      the room's `completed` status is first observed, writing the coin delta to Firestore
 *
 * Ref guards:
 *   - `completedRef` — prevents the host from calling `completeGame` more than once
 *   - `recordedRef`  — prevents `recordMyResult` from firing on subsequent re-renders
 */
export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { completeGame, recordMyResult } = useGameStore();
  const refreshUser = useAuthStore(s => s.refreshUser);
  const { room, loading } = useRoom(roomId ?? '');
  const { prices } = useStockPrices(SYMBOLS);

  const [countdown, setCountdown] = useState('');
  const [showWinner, setShowWinner] = useState(false);
  // Guards: prevent the host from resolving the game twice, and prevent double coin recording
  const completedRef = useRef(false);
  const recordedRef = useRef(false);

  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));
  const hostPicks: DraftPick[] = room?.picks.filter(p => p.userId === room.hostId) ?? [];
  const guestPicks: DraftPick[] = room?.picks.filter(p => p.userId === room.guestId) ?? [];
  // `usePortfolio` computes gain% for each side based on draft prices vs. current prices
  const { host, guest } = usePortfolio(hostPicks, guestPicks, prices);

  const isHost = room?.hostId === user?.uid;
  const myPicks = isHost ? host : guest;
  const opponentPicks = isHost ? guest : host;
  const myName = user?.displayName ?? 'You';

  /**
   * checkEnd — called every second by the countdown interval.
   * If the room is already marked completed, just show the modal.
   * Otherwise, if the wall-clock time has passed `endTime`, the host
   * resolves the winner and writes the final gains to Firestore.
   */
  const checkEnd = useCallback(async () => {
    if (!room || !roomId || completedRef.current) return;
    if (room.status === 'completed') { setShowWinner(true); return; }
    if (!room.endTime) return;
    if (Date.now() >= room.endTime) {
      completedRef.current = true;
      if (room.hostId === user?.uid) {
        // Only the host writes the result to avoid concurrent writes
        const winner = determineWinner(hostPicks, guestPicks, prices);
        const winnerId = winner === 'tie' ? null : winner === 'host' ? room.hostId : (room.guestId ?? null);
        const hostGain = calcDraftPortfolioGain(hostPicks, prices);
        const guestGain = calcDraftPortfolioGain(guestPicks, prices);
        await completeGame(roomId, winnerId, hostGain, guestGain);
      }
      setShowWinner(true);
    }
  }, [room, roomId, hostPicks, guestPicks, prices, completeGame, user]);

  // Tick the countdown every second and check for game end
  useEffect(() => {
    if (!room?.endTime || room.status === 'completed') return;
    const tick = setInterval(() => {
      setCountdown(formatCountdown(room.endTime!));
      checkEnd();
    }, 1000);
    setCountdown(formatCountdown(room.endTime));
    return () => clearInterval(tick);
  }, [room?.endTime, room?.status, checkEnd]);

  // Record this player's result (wins/losses + coins) once when the room first becomes 'completed'
  useEffect(() => {
    if (room?.status !== 'completed' || !user || recordedRef.current) return;
    recordedRef.current = true;
    recordMyResult(user.uid, room.id, room.winnerId, room.coinReward).then(() => refreshUser());
    setShowWinner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  // If the room is still in 'waiting' (e.g. user navigated here directly), send them to the lobby
  useEffect(() => {
    if (!loading && room && room.status === 'waiting') navigate('/lobby');
  }, [loading, room, navigate]);

  if (loading || !room) return <LoadingSpinner fullScreen />;

  // Derived winner state from Firestore (null winnerId means tie)
  const winner = room.winnerId;
  const isWinner = winner === user?.uid;
  const isTie = winner === null;

  const leading = myPicks.gainPercent > opponentPicks.gainPercent;
  const tied = myPicks.gainPercent === opponentPicks.gainPercent;

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 pb-8">
      <div className="max-w-4xl mx-auto space-y-5 pt-6">

        {/* Header — game title and live countdown */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Live Game</h1>
            <div className="flex items-center gap-2 mt-1">
              {/* Pulsing red dot signals that the game is currently active */}
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

        {/* Score cards — highlights the leading player's card with a green glow */}
        <div className="grid grid-cols-2 gap-4">
          {/* My portfolio gain */}
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

          {/* Opponent's portfolio gain */}
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

        {/* Per-stock breakdown — each pick shown with its individual gain% since draft */}
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
                    // Current price falls back to draftPrice if the quote hasn't loaded yet
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

      {/* Winner modal — backdrop closes the modal; inner div stops propagation */}
      {showWinner && (
        <div
          className="fixed inset-0 bg-[#0a0908]/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowWinner(false)}
        >
          <div
            className="bg-[#161311] border border-white/[0.1] rounded-3xl p-8 max-w-sm w-full text-center space-y-5 animate-scale-in shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Result icon — trophy, handshake, or down-chart */}
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
              {/* Coin reward line — only shown to the winner */}
              {isWinner && !isTie && (
                <p className="text-[#c8a882] text-sm mt-1">+50 ◈ coins earned</p>
              )}
            </div>

            {/* Final gain comparison */}
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
            {/* Dismiss the modal without navigating away — lets the user inspect the live board */}
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
