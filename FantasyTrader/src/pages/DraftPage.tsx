// 1v1 snake draft page

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { STOCK_POOL } from '../lib/finnhub';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Snake draft order for 8 picks (4 each): Host, Guest, Guest, Host, Host, Guest, Guest, Host
const DRAFT_ORDER = [0, 1, 1, 0, 0, 1, 1, 0];
const PLAYER_NAMES = ['You', 'Opponent'];
const PLAYER_COLORS = ['text-emerald-400', 'text-blue-400'];
const PLAYER_BG = ['bg-emerald-500/10 border-emerald-500/20', 'bg-blue-500/10 border-blue-500/20'];
const COUNTDOWN_SECONDS = 30;

/** Interactive snake draft page with 30s auto-pick countdown. */
export default function DraftPage() {
  const navigate = useNavigate();
  const [picks, setPicks] = useState<string[][]>([[], []]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [available, setAvailable] = useState(STOCK_POOL.map(s => s.symbol));
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [draftComplete, setDraftComplete] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPlayer = DRAFT_ORDER[currentTurn] ?? 0;

  function pickStock(symbol: string) {
    if (draftComplete || !available.includes(symbol)) return;
    const player = DRAFT_ORDER[currentTurn];
    const newPicks = [picks[0].slice(), picks[1].slice()];
    newPicks[player].push(symbol);
    const newAvailable = available.filter(s => s !== symbol);
    const nextTurn = currentTurn + 1;
    setPicks(newPicks);
    setAvailable(newAvailable);
    setCountdown(COUNTDOWN_SECONDS);
    if (nextTurn >= DRAFT_ORDER.length) {
      setDraftComplete(true);
    } else {
      setCurrentTurn(nextTurn);
    }
  }

  // Countdown ticker + auto-pick on expiry
  useEffect(() => {
    if (draftComplete) return;
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-pick first available stock
          if (available.length > 0) {
            setTimeout(() => pickStock(available[0]), 0);
          }
          return COUNTDOWN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, draftComplete]);

  const countdownPct = (countdown / COUNTDOWN_SECONDS) * 100;
  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));

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
                <span className={PLAYER_COLORS[currentPlayer]}>{PLAYER_NAMES[currentPlayer]}</span>'s pick
              </p>
              <p className={`text-2xl font-mono font-bold ${countdown <= 10 ? 'text-red-400' : 'text-zinc-100'}`}>
                {countdown}s
              </p>
            </div>
          )}
        </div>

        {/* Countdown bar */}
        {!draftComplete && (
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
            <Button variant="primary" onClick={() => navigate('/sandbox')}>
              Start Game (demo)
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock grid */}
          <div className="lg:col-span-2">
            <h2 className="text-zinc-400 text-xs uppercase tracking-wide mb-3">Available Stocks</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STOCK_POOL.map(stock => {
                const isPicked = !available.includes(stock.symbol);
                const pickedByPlayer = isPicked
                  ? picks[0].includes(stock.symbol) ? 0 : 1
                  : null;
                const isMyTurn = !draftComplete && currentPlayer === 0;

                return (
                  <button
                    key={stock.symbol}
                    onClick={() => isMyTurn && pickStock(stock.symbol)}
                    disabled={isPicked || draftComplete || !isMyTurn}
                    className={`relative rounded-xl p-3 border text-left transition-all ${
                      isPicked
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-40 cursor-not-allowed'
                        : isMyTurn
                        ? 'bg-zinc-900 border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800 cursor-pointer'
                        : 'bg-zinc-900 border-zinc-700 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isPicked && pickedByPlayer !== null && (
                      <span className={`absolute top-1.5 right-1.5 text-xs font-bold ${PLAYER_COLORS[pickedByPlayer]}`}>
                        {PLAYER_NAMES[pickedByPlayer][0]}
                      </span>
                    )}
                    <p className="font-mono font-bold text-zinc-100 text-sm">{stock.symbol}</p>
                    <p className="text-zinc-400 text-xs truncate mt-0.5">{stock.name}</p>
                    <Badge variant="gray" >{stock.sector}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pick lists */}
          <div className="space-y-4">
            {[0, 1].map(player => (
              <div key={player} className={`bg-zinc-900 border rounded-2xl p-4 ${PLAYER_BG[player]}`}>
                <h3 className={`font-semibold mb-3 ${PLAYER_COLORS[player]}`}>
                  {PLAYER_NAMES[player]}'s Picks ({picks[player].length}/4)
                </h3>
                <div className="space-y-2">
                  {picks[player].map((sym, i) => (
                    <div key={sym} className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs w-4">{i + 1}.</span>
                      <div>
                        <p className="font-mono font-bold text-zinc-100 text-sm">{sym}</p>
                        <p className="text-zinc-400 text-xs">{stockBySymbol[sym]?.name}</p>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 4 - picks[player].length }).map((_, i) => (
                    <div key={i} className="h-9 bg-zinc-800/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="text-zinc-400 text-xs uppercase tracking-wide mb-2">Pick Order</h3>
              <div className="flex flex-wrap gap-1">
                {DRAFT_ORDER.map((player, i) => (
                  <span
                    key={i}
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < currentTurn
                        ? 'bg-zinc-800 text-zinc-500'
                        : i === currentTurn && !draftComplete
                        ? `${PLAYER_COLORS[player]} ring-2 ring-current bg-current/10`
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {PLAYER_NAMES[player][0]}
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
