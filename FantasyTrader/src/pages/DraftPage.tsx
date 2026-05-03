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

const DRAFT_ORDER = [0, 1, 1, 0, 0, 1, 1, 0];
const COUNTDOWN_SECONDS = 30;
const SYMBOLS = STOCK_POOL.map(s => s.symbol);

const RING_R = 22;
const RING_CIRC = 2 * Math.PI * RING_R;

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
  const playerIndex = isHost ? 0 : 1;

  const pickedSymbols = new Set(room?.picks.map(p => p.symbol) ?? []);
  const available = STOCK_POOL.filter(s => !pickedSymbols.has(s.symbol));

  const draftComplete = (room?.currentTurn ?? 0) >= DRAFT_ORDER.length;
  const currentPlayerIndex = DRAFT_ORDER[room?.currentTurn ?? 0] ?? 0;
  const isMyTurn = !draftComplete && currentPlayerIndex === playerIndex;

  useEffect(() => {
    if (room?.status === 'active' && roomId) navigate(`/game/${roomId}`);
  }, [room?.status, roomId, navigate]);

  useEffect(() => {
    setCountdown(COUNTDOWN_SECONDS);
    autoPickedRef.current = false;
  }, [room?.currentTurn]);

  useEffect(() => {
    if (draftComplete || !isMyTurn) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (!autoPickedRef.current && available.length > 0) {
            autoPickedRef.current = true;
            const best = available.reduce((a, b) =>
              (prices[b.symbol]?.changePercent ?? 0) > (prices[a.symbol]?.changePercent ?? 0) ? b : a
            );
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
  }

  const countdownPct = countdown / COUNTDOWN_SECONDS;
  const ringOffset = RING_CIRC * (1 - countdownPct);
  const isUrgent = countdown <= 10;

  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));
  const hostPicks = room?.picks.filter(p => p.userId === room.hostId) ?? [];
  const guestPicks = room?.picks.filter(p => p.userId === room.guestId) ?? [];
  const hostName = isHost ? 'You' : 'Opponent';
  const guestName = isHost ? 'Opponent' : 'You';

  if (loading || !room) return <LoadingSpinner fullScreen />;

  if (room.status === 'waiting') {
    return (
      <div className="pt-14 min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-[rgba(200,168,130,0.1)] border border-[rgba(200,168,130,0.2)] flex items-center justify-center mx-auto">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c8a882]"
              style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
            />
          </div>
          <p className="text-[#ede8df] font-medium">Waiting for opponent…</p>
          <p className="text-[#7a6e60] text-sm">Share the room code from the lobby</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 py-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Draft</h1>
            <p className="text-[#7a6e60] text-sm mt-0.5">Snake draft · 4 picks each</p>
          </div>

          {!draftComplete && (
            <div className="flex flex-col items-center gap-1">
              {/* Circular countdown ring */}
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90">
                  <circle cx="26" cy="26" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle
                    cx="26" cy="26" r={RING_R}
                    fill="none"
                    stroke={isUrgent ? '#ff4560' : isMyTurn ? '#c8a882' : '#7a6e60'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={isMyTurn ? ringOffset : 0}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-mono font-black text-sm tabular-nums ${isUrgent ? 'text-[#ff4560]' : isMyTurn ? 'text-[#c8a882]' : 'text-[#7a6e60]'}`}>
                    {isMyTurn ? countdown : '—'}
                  </span>
                </div>
              </div>
              <p className={`text-[11px] font-medium ${currentPlayerIndex === playerIndex ? 'text-[#c8a882]' : 'text-[#7a6e60]'}`}>
                {currentPlayerIndex === playerIndex ? 'Your pick' : "Opponent's pick"}
              </p>
            </div>
          )}
        </div>

        {/* Draft complete banner */}
        {draftComplete && (
          <div className="bg-[rgba(200,168,130,0.06)] border border-[rgba(200,168,130,0.2)] rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-[#c8a882] font-semibold">Draft complete</p>
              <p className="text-[#7a6e60] text-sm mt-0.5">All picks are locked in</p>
            </div>
            {isHost ? (
              <Button variant="primary" onClick={handleStartGame} loading={startingGame}>
                Start Game →
              </Button>
            ) : (
              <p className="text-[#7a6e60] text-sm">Waiting for host to start…</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Stock grid */}
          <div className="lg:col-span-2">
            <p className="text-[#7a6e60] text-xs font-medium uppercase tracking-widest mb-3">
              Available — {available.length} remaining
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {STOCK_POOL.map(stock => {
                const isPicked = pickedSymbols.has(stock.symbol);
                const pickedByPick = isPicked ? room?.picks.find(p => p.symbol === stock.symbol) : null;
                const pickedByHost = pickedByPick?.userId === room?.hostId;
                const pct = prices[stock.symbol]?.changePercent;
                const isUp = pct !== undefined ? pct >= 0 : true;

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => isMyTurn && handlePick(stock.symbol)}
                    disabled={isPicked || draftComplete || !isMyTurn}
                    className={`relative rounded-xl p-3 border text-left transition-all duration-150 ${
                      isPicked
                        ? 'opacity-30 cursor-not-allowed border-white/[0.05] bg-transparent'
                        : isMyTurn
                        ? 'bg-[#161311] border-white/[0.09] hover:border-[rgba(200,168,130,0.4)] hover:bg-[rgba(200,168,130,0.05)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-[#100e0c] border-white/[0.05] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isPicked && pickedByPick && (
                      <span className={`absolute top-1.5 right-1.5 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${
                        pickedByHost
                          ? 'bg-[rgba(200,168,130,0.15)] text-[#c8a882]'
                          : 'bg-[rgba(90,138,136,0.15)] text-[#5a8a88]'
                      }`}>
                        {pickedByHost ? hostName[0] : guestName[0]}
                      </span>
                    )}
                    <p className="font-mono font-black text-[#ede8df] text-sm">{stock.symbol}</p>
                    <p className="text-[#7a6e60] text-[10px] truncate mt-0.5">{stock.name}</p>
                    {pct !== undefined && !isPicked && (
                      <span className={`text-[10px] font-mono font-semibold mt-1.5 inline-block ${isUp ? 'text-[#c8a882]' : 'text-[#ff4560]'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    )}
                    {isPicked && (
                      <Badge variant={pickedByHost ? 'green' : 'blue'}>
                        {pickedByHost ? hostName : guestName}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Picks sidebar */}
          <div className="space-y-4">
            {[
              { name: hostName, picks: hostPicks, color: '#c8a882', dimBg: 'rgba(200,168,130,0.05)', dimBorder: 'rgba(200,168,130,0.15)' },
              { name: guestName, picks: guestPicks, color: '#5a8a88', dimBg: 'rgba(90,138,136,0.05)', dimBorder: 'rgba(90,138,136,0.15)' },
            ].map(({ name, picks, color, dimBg, dimBorder }) => (
              <div key={name} className="rounded-2xl p-4 border"
                style={{ backgroundColor: dimBg, borderColor: dimBorder }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm" style={{ color }}>{name}</p>
                  <span className="text-[#7a6e60] text-xs font-mono">{picks.length}/4</span>
                </div>
                <div className="space-y-2">
                  {picks.map((pick, i) => (
                    <div key={pick.symbol} className="flex items-center gap-2.5 bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2">
                      <span className="text-[#7a6e60] text-xs font-mono w-4 shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-mono font-black text-[#ede8df] text-sm">{pick.symbol}</p>
                        <p className="text-[#7a6e60] text-[10px]">{stockBySymbol[pick.symbol]?.name}</p>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 4 - picks.length }).map((_, i) => (
                    <div key={i} className="h-[48px] bg-white/[0.02] rounded-lg border border-dashed border-white/[0.06] flex items-center justify-center">
                      <span className="text-[#3a3028] text-xs">Pick {picks.length + i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pick order */}
            <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-4">
              <p className="text-[#7a6e60] text-xs font-medium uppercase tracking-widest mb-3">Pick Order</p>
              <div className="flex gap-1.5 flex-wrap">
                {DRAFT_ORDER.map((p, i) => {
                  const isDone = i < (room?.currentTurn ?? 0);
                  const isCurrent = i === (room?.currentTurn ?? 0) && !draftComplete;
                  return (
                    <div
                      key={i}
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isDone
                          ? 'bg-white/[0.04] text-[#3a3028]'
                          : isCurrent
                          ? `ring-2 ${p === 0 ? 'ring-[#c8a882] text-[#c8a882] bg-[rgba(200,168,130,0.1)]' : 'ring-[#5a8a88] text-[#5a8a88] bg-[rgba(90,138,136,0.1)]'}`
                          : 'bg-white/[0.03] text-[#7a6e60]'
                      }`}
                    >
                      {p === 0 ? hostName[0] : guestName[0]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
