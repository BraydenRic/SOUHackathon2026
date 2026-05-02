// 1v1 snake draft page — Firestore-backed real-time sync

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { STOCK_POOL } from '../lib/finnhub';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useStockPrices } from '../hooks/useStockPrices';
import { useRoom } from '../hooks/useRoom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { DraftPick } from '../types';

// Snake draft order: Host(0), Guest(1), Guest(1), Host(0), Host(0), Guest(1), Guest(1), Host(0)
const DRAFT_ORDER = [0, 1, 1, 0, 0, 1, 1, 0];
const COUNTDOWN_SECONDS = 30;

const SYMBOLS = STOCK_POOL.map(s => s.symbol);

/** Firestore-backed snake draft with 30s auto-pick countdown. */
export default function DraftPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { makeDraftPick, startGame } = useGameStore();
  const { room, loading } = useRoom(roomId ?? '');
  const { prices } = useStockPrices(SYMBOLS);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [startingGame, setStartingGame] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPickedRef = useRef(false);

  const isHost = room?.hostId === user?.uid;
  // Player index: 0 = host, 1 = guest
  const playerIndex = isHost ? 0 : 1;

  const pickedSymbols = new Set(room?.picks.map(p => p.symbol) ?? []);
  const available = STOCK_POOL.filter(s => !pickedSymbols.has(s.symbol));

  const draftComplete = (room?.currentTurn ?? 0) >= DRAFT_ORDER.length;
  const currentPlayerIndex = DRAFT_ORDER[room?.currentTurn ?? 0] ?? 0;
  const isMyTurn = !draftComplete && currentPlayerIndex === playerIndex;

  // Redirect to game page once host starts the game
  useEffect(() => {
    if (room?.status === 'active' && roomId) {
      navigate(`/game/${roomId}`);
    }
  }, [room?.status, roomId, navigate]);

  // Reset countdown whenever the turn advances
  useEffect(() => {
    setCountdown(COUNTDOWN_SECONDS);
    autoPickedRef.current = false;
  }, [room?.currentTurn]);

  // Countdown ticker + auto-pick on expiry (only fires on your turn)
  useEffect(() => {
    if (draftComplete || !isMyTurn) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (!autoPickedRef.current && available.length > 0) {
            autoPickedRef.current = true;
            // Auto-pick the stock with the best change% (or first available as fallback)
            const best = available.reduce((a, b) => {
              const aChg = prices[a.symbol]?.changePercent ?? 0;
              const bChg = prices[b.symbol]?.changePercent ?? 0;
              return bChg > aChg ? b : a;
            });
            handlePick(best.symbol);
          }
          return COUNTDOWN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.currentTurn, draftComplete, isMyTurn]);

  function handlePick(symbol: string) {
    if (!roomId || !user || !room || draftComplete) return;
    if (pickedSymbols.has(symbol)) return;
    const pick: DraftPick = {
      userId: user.uid,
      symbol,
      pickNumber: room.currentTurn,
      draftPrice: prices[symbol]?.price ?? 0,
    };
    makeDraftPick(roomId, pick);
  }

  async function handleStartGame() {
    if (!roomId) return;
    setStartingGame(true);
    await startGame(roomId);
    // navigation happens via useEffect watching room.status
  }

  const countdownPct = (countdown / COUNTDOWN_SECONDS) * 100;
  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));

  const hostPicks = room?.picks.filter(p => p.userId === room.hostId) ?? [];
  const guestPicks = room?.picks.filter(p => p.userId === room.guestId) ?? [];

  const hostName = isHost ? 'You' : 'Opponent';
  const guestName = isHost ? 'Opponent' : 'You';

  if (loading || !room) return <LoadingSpinner fullScreen />;

  // Waiting for second player
  if (room.status === 'waiting') {
    return (
      <div className="pt-14 min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center text-zinc-400">
            <span className="h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
            Waiting for opponent to join…
          </div>
          <p className="text-zinc-500 text-sm">Share the room code from the lobby</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14 min-h-screen bg-zinc-950 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-zinc-100 text-2xl font-bold">Draft</h1>
            <p className="text-zinc-400 text-sm">Snake draft — 4 picks each</p>
          </div>
          {!draftComplete && (
            <div className="text-right">
              <p className="text-zinc-400 text-xs mb-1">
                <span className={currentPlayerIndex === 0 ? 'text-emerald-400' : 'text-blue-400'}>
                  {currentPlayerIndex === playerIndex ? 'Your' : "Opponent's"}
                </span>{' '}pick
              </p>
              <p className={`text-2xl font-mono font-bold ${countdown <= 10 ? 'text-red-400' : 'text-zinc-100'}`}>
                {isMyTurn ? `${countdown}s` : '—'}
              </p>
            </div>
          )}
        </div>

        {/* Countdown bar */}
        {!draftComplete && isMyTurn && (
          <div className="h-1.5 bg-zinc-800 rounded-full mb-6 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${countdown <= 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${countdownPct}%` }}
            />
          </div>
        )}

        {draftComplete && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <p className="text-emerald-400 font-semibold">Draft complete! All picks are in.</p>
            {isHost && (
              <Button variant="primary" onClick={handleStartGame} loading={startingGame}>
                Start Game
              </Button>
            )}
            {!isHost && <p className="text-zinc-400 text-sm">Waiting for host to start…</p>}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock grid */}
          <div className="lg:col-span-2">
            <h2 className="text-zinc-400 text-xs uppercase tracking-wide mb-3">Available Stocks</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STOCK_POOL.map(stock => {
                const isPicked = pickedSymbols.has(stock.symbol);
                const pickedByPick = isPicked ? room?.picks.find(p => p.symbol === stock.symbol) : null;
                const pickedByHost = pickedByPick?.userId === room?.hostId;

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => isMyTurn && handlePick(stock.symbol)}
                    disabled={isPicked || draftComplete || !isMyTurn}
                    className={`relative rounded-xl p-3 border text-left transition-all ${
                      isPicked
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-40 cursor-not-allowed'
                        : isMyTurn
                        ? 'bg-zinc-900 border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 cursor-pointer'
                        : 'bg-zinc-900 border-zinc-700 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isPicked && pickedByPick && (
                      <span className={`absolute top-1.5 right-1.5 text-xs font-bold ${pickedByHost ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {pickedByHost ? hostName[0] : guestName[0]}
                      </span>
                    )}
                    <p className="font-mono font-bold text-zinc-100 text-sm">{stock.symbol}</p>
                    <p className="text-zinc-400 text-xs truncate mt-0.5">{stock.name}</p>
                    <Badge variant="gray">{stock.sector}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pick lists */}
          <div className="space-y-4">
            {[
              { name: hostName, picks: hostPicks, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { name: guestName, picks: guestPicks, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            ].map(({ name, picks, color, bg }) => (
              <div key={name} className={`bg-zinc-900 border rounded-2xl p-4 ${bg}`}>
                <h3 className={`font-semibold mb-3 ${color}`}>{name}'s Picks ({picks.length}/4)</h3>
                <div className="space-y-2">
                  {picks.map((pick, i) => (
                    <div key={pick.symbol} className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs w-4">{i + 1}.</span>
                      <div>
                        <p className="font-mono font-bold text-zinc-100 text-sm">{pick.symbol}</p>
                        <p className="text-zinc-400 text-xs">{stockBySymbol[pick.symbol]?.name}</p>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 4 - picks.length }).map((_, i) => (
                    <div key={i} className="h-9 bg-zinc-800/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ))}

            {/* Pick order indicator */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="text-zinc-400 text-xs uppercase tracking-wide mb-2">Pick Order</h3>
              <div className="flex flex-wrap gap-1">
                {DRAFT_ORDER.map((p, i) => (
                  <span
                    key={i}
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < (room?.currentTurn ?? 0)
                        ? 'bg-zinc-800 text-zinc-500'
                        : i === (room?.currentTurn ?? 0) && !draftComplete
                        ? `${p === 0 ? 'text-emerald-400' : 'text-blue-400'} ring-2 ring-current bg-current/10`
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {p === 0 ? hostName[0] : guestName[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
