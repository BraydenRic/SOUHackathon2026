// Game page — live leaderboard, countdown, and winner modal

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { STOCK_POOL } from '../lib/finnhub';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useRoom } from '../hooks/useRoom';
import { usePortfolio } from '../hooks/usePortfolio';
import { useStockPrices } from '../hooks/useStockPrices';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatSignedPercent, formatCountdown } from '../utils/formatters';
import { determineWinner, calcDraftPortfolioGain } from '../utils/calculations';
import type { DraftPick } from '../types';

const SYMBOLS = STOCK_POOL.map(s => s.symbol);

/** Live game page — leaderboard, countdown, and winner determination. */
export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { completeGame } = useGameStore();
  const refreshUser = useAuthStore(s => s.refreshUser);
  const { room, loading } = useRoom(roomId ?? '');
  const { prices } = useStockPrices(SYMBOLS);

  const [countdown, setCountdown] = useState('');
  const [showWinner, setShowWinner] = useState(false);
  const completedRef = useRef(false);

  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));

  const hostPicks: DraftPick[] = room?.picks.filter(p => p.userId === room.hostId) ?? [];
  const guestPicks: DraftPick[] = room?.picks.filter(p => p.userId === room.guestId) ?? [];
  const { host, guest } = usePortfolio(hostPicks, guestPicks, prices);

  const isHost = room?.hostId === user?.uid;
  const myPicks = isHost ? host : guest;
  const opponentPicks = isHost ? guest : host;
  const myName = user?.displayName ?? 'You';
  const opponentName = isHost ? 'Opponent' : 'Opponent';

  // Countdown ticker and game completion check
  const checkEnd = useCallback(async () => {
    if (!room || !roomId || completedRef.current) return;
    if (room.status === 'completed') { setShowWinner(true); return; }
    if (!room.endTime) return;
    if (Date.now() >= room.endTime) {
      completedRef.current = true;
      const winner = determineWinner(hostPicks, guestPicks, prices);
      const winnerId = winner === 'tie' ? null : winner === 'host' ? room.hostId : (room.guestId ?? null);
      if (room.hostId === user?.uid) {
        const hostGain = calcDraftPortfolioGain(hostPicks, prices);
        const guestGain = calcDraftPortfolioGain(guestPicks, prices);
        await completeGame(roomId, winnerId, room.hostId, room.guestId, room.coinReward, hostGain, guestGain);
      }
      await refreshUser();
      setShowWinner(true);
    }
  }, [room, roomId, hostPicks, guestPicks, prices, completeGame, user, refreshUser]);

  useEffect(() => {
    if (!room?.endTime) return;
    const tick = setInterval(() => {
      setCountdown(formatCountdown(room.endTime!));
      checkEnd();
    }, 1000);
    setCountdown(formatCountdown(room.endTime));
    return () => clearInterval(tick);
  }, [room?.endTime, checkEnd]);

  // Show winner modal if room already completed (e.g. reloading the page); refresh guest stats
  useEffect(() => {
    if (room?.status === 'completed') {
      setShowWinner(true);
      refreshUser();
    }
  }, [room?.status, refreshUser]);

  // Redirect if room isn't active yet
  useEffect(() => {
    if (!loading && room && room.status === 'waiting') navigate('/lobby');
  }, [loading, room, navigate]);

  if (loading || !room) return <LoadingSpinner fullScreen />;

  const winner = room.winnerId;
  const isWinner = winner === user?.uid;
  const isTie = !winner || (room.hostId === winner && room.guestId === winner);

  function PickRow({ pick }: { pick: DraftPick }) {
    const current = prices[pick.symbol]?.price ?? pick.draftPrice;
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
    <div className="pt-14 min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-zinc-100 text-2xl font-bold">Live Game</h1>
            <p className="text-zinc-400 text-sm capitalize">{room.duration} competition</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-400 text-xs mb-1">Time remaining</p>
            <p className="text-zinc-100 text-xl font-mono font-bold">{countdown || '—'}</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: myName, stats: myPicks, highlight: true },
            { name: opponentName, stats: opponentPicks, highlight: false },
          ].map(({ name, stats, highlight }) => (
            <div
              key={name}
              className={`rounded-2xl p-6 border ${highlight ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800'}`}
            >
              <p className={`text-sm font-medium mb-1 ${highlight ? 'text-emerald-400' : 'text-blue-400'}`}>{name}</p>
              <p className={`text-4xl font-mono font-bold ${stats.gainPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatSignedPercent(stats.gainPercent, 4)}
              </p>
              <p className="text-zinc-500 text-xs mt-1">portfolio gain</p>
            </div>
          ))}
        </div>

        {/* Pick details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: myName, picks: myPicks.picks, color: 'emerald' },
            { name: opponentName, picks: opponentPicks.picks, color: 'blue' },
          ].map(({ name, picks, color }) => (
            <div key={name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className={`text-sm font-semibold mb-3 text-${color}-400`}>{name}'s Picks</h3>
              {picks.length === 0
                ? <p className="text-zinc-500 text-sm">No picks yet</p>
                : picks.map(pick => <PickRow key={pick.symbol} pick={pick} />)
              }
            </div>
          ))}
        </div>
      </div>

      {/* Winner modal */}
      {showWinner && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowWinner(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 max-w-sm w-full text-center space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl">{isTie ? '🤝' : isWinner ? '🏆' : '😔'}</div>
            <h2 className="text-zinc-100 text-2xl font-bold">
              {isTie ? "It's a Tie!" : isWinner ? 'You Won!' : 'You Lost'}
            </h2>
            <div className="space-y-1">
              <p className="text-zinc-400 text-sm">
                Your portfolio: <span className={`font-semibold ${myPicks.gainPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatSignedPercent(myPicks.gainPercent)}
                </span>
              </p>
              <p className="text-zinc-400 text-sm">
                Opponent: <span className={`font-semibold ${opponentPicks.gainPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatSignedPercent(opponentPicks.gainPercent)}
                </span>
              </p>
            </div>
            <button
              onClick={() => navigate('/lobby')}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl transition-colors cursor-pointer"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
