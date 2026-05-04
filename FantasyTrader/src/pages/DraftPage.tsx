/**
 * DraftPage.tsx
 *
 * This is the main draft page where two players take turns picking stocks before
 * the actual game starts. It uses a "snake draft" format, which means the pick
 * order goes: Host, Guest, Guest, Host, Host, Guest, Guest, Host — so neither
 * player gets an unfair advantage by always picking first.
 *
 * Each player has 30 seconds to make their pick. If they run out of time,
 * the game auto-picks the best performing stock for them (based on change%).
 * Everything is synced in real-time through Firestore so both players see
 * updates instantly without needing to refresh.
 *
 * Once all 8 picks are made, the host gets a button to officially start the game,
 * which redirects both players to the live game page.
 */

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

/**
 * The snake draft order as an array of player indices.
 * 0 = host, 1 = guest.
 * Follows the pattern: H, G, G, H, H, G, G, H
 * This gives each player 4 picks total and keeps it fair.
 */
const DRAFT_ORDER = [0, 1, 1, 0, 0, 1, 1, 0];

/**
 * How many seconds each player gets to make their pick before
 * the game auto-picks for them.
 */
const COUNTDOWN_SECONDS = 30;

/** All stock symbols from the pool, used to subscribe to live prices. */
const SYMBOLS = STOCK_POOL.map(s => s.symbol);

/**
 * Radius of the circular SVG countdown ring in SVG units.
 * Used to calculate the stroke-dashoffset for the animation.
 */
const RING_R = 22;

/**
 * The full circumference of the countdown ring circle.
 * Formula: 2 * PI * radius
 * We use this to animate the ring draining as time runs out.
 */
const RING_CIRC = 2 * Math.PI * RING_R;

/**
 * DraftPage component
 *
 * Handles everything related to the pre-game stock draft:
 * - Shows available stocks and lets the current player pick one
 * - Tracks whose turn it is based on the snake draft order
 * - Runs a 30-second countdown timer that auto-picks if time expires
 * - Shows each player's picks in a sidebar as they're made
 * - Redirects to the game page once the host clicks "Start Game"
 *
 * This component subscribes to the room document in Firestore via useRoom(),
 * so any pick made by either player shows up instantly for both.
 */
export default function DraftPage() {
  /** Room ID pulled from the URL, e.g. /draft/:roomId */
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  /** The currently logged-in user from auth state. */
  const user = useAuthStore(s => s.user);

  /** Game store actions for making picks and starting the game. */
  const { makeDraftPick, startGame } = useGameStore();

  /**
   * Live room data from Firestore.
   * This updates in real-time whenever either player makes a pick
   * or the host starts the game.
   */
  const { room, loading } = useRoom(roomId ?? '');

  /**
   * Live stock prices for all symbols in the pool.
   * Used to show change% on each stock card and for auto-pick logic.
   */
  const { prices } = useStockPrices(SYMBOLS);

  /** How many seconds are left in the current player's turn. Starts at 30. */
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  /** Tracks whether we're waiting for the startGame Firestore call to finish. */
  const [startingGame, setStartingGame] = useState(false);

  /** Ref to the interval ID so we can clear it when the turn changes or component unmounts. */
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Ref flag to make sure we only auto-pick once per turn.
   * Without this, the interval could fire multiple times and try to pick multiple stocks.
   */
  const autoPickedRef = useRef(false);

  /**
   * Whether the current user is the host of this room.
   * Determines which player index they are (0 = host, 1 = guest).
   */
  const isHost = room?.hostId === user?.uid;

  /** 0 if the current user is the host, 1 if they're the guest. */
  const playerIndex = isHost ? 0 : 1;

  /** Set of all stock symbols that have already been picked by either player. */
  const pickedSymbols = new Set(room?.picks.map(p => p.symbol) ?? []);

  /** Stocks that haven't been picked yet — these are what we auto-pick from. */
  const available = STOCK_POOL.filter(s => !pickedSymbols.has(s.symbol));

  /** True when all 8 picks have been made (currentTurn has gone past the last index). */
  const draftComplete = (room?.currentTurn ?? 0) >= DRAFT_ORDER.length;

  /** Which player index (0 or 1) should be picking right now. */
  const currentPlayerIndex = DRAFT_ORDER[room?.currentTurn ?? 0] ?? 0;

  /** True if it's currently this user's turn to pick. */
  const isMyTurn = !draftComplete && currentPlayerIndex === playerIndex;

  /**
   * Once the host clicks "Start Game" and Firestore updates the room status to 'active',
   * both players get redirected to the live game page automatically.
   * This fires for both the host and the guest since they're both listening to the room.
   */
  useEffect(() => {
    if (room?.status === 'active' && roomId) navigate(`/game/${roomId}`);
  }, [room?.status, roomId, navigate]);

  /**
   * Reset the countdown back to 30 seconds every time the turn changes.
   * Also reset the auto-pick flag so the new player gets a fresh 30 seconds.
   * This fires whenever currentTurn changes in Firestore, which happens after each pick.
   */
  useEffect(() => {
    setCountdown(COUNTDOWN_SECONDS);
    autoPickedRef.current = false;
  }, [room?.currentTurn]);

  /**
   * The main countdown timer effect.
   * Only runs when it's this player's turn and the draft isn't done.
   *
   * Every second it ticks down the countdown. When it hits 0:
   * 1. It checks that we haven't already auto-picked this turn (autoPickedRef)
   * 2. It finds the stock with the highest change% from the available ones
   * 3. It calls handlePick() with that stock symbol
   *
   * We use a ref for the interval so we can clear it when the effect re-runs
   * or when the component unmounts — otherwise we'd have a memory leak.
   *
   * The eslint disable comment is intentional — handlePick is defined below
   * and adding it to the dependency array would cause infinite re-renders.
   */
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

  /**
   * handlePick - submits a draft pick to Firestore
   *
   * Called either when a player clicks a stock card, or automatically
   * when their 30 seconds run out. Does a bunch of safety checks first
   * to make sure the pick is actually valid before sending it to Firestore.
   *
   * @param symbol - The stock ticker symbol being picked (e.g. "AAPL")
   */
  function handlePick(symbol: string) {
    // Safety checks — don't pick if we're missing required data
    if (!roomId || !user || !room || draftComplete) return;

    // Don't allow picking a stock that's already been taken
    if (pickedSymbols.has(symbol)) return;

    const pick: DraftPick = {
      userId: user.uid,
      symbol,
      pickNumber: room.currentTurn,
      // Lock in the current price as the "draft price" so we can calculate
      // gain/loss later based on where it started when they picked it
      draftPrice: prices[symbol]?.price ?? 0,
    };

    makeDraftPick(roomId, pick);
  }

  /**
   * handleStartGame - called when the host clicks the "Start Game" button
   *
   * Only the host can start the game (guest sees a waiting message instead).
   * Sets a loading state so the button shows a spinner while the Firestore
   * write is happening. Navigation to the game page is handled by the
   * useEffect watching room.status above.
   */
  async function handleStartGame() {
    if (!roomId) return;
    setStartingGame(true);
    await startGame(roomId);
    // Don't need to navigate here — the useEffect above handles it
    // once Firestore updates room.status to 'active'
  }

  /**
   * countdownPct - what fraction of time is remaining (0 to 1)
   * Used to calculate how much of the SVG ring to show.
   */
  const countdownPct = countdown / COUNTDOWN_SECONDS;

  /**
   * ringOffset - how far to offset the SVG stroke so it looks like it's draining.
   * When offset = 0, the full ring is visible. When offset = RING_CIRC, ring is empty.
   */
  const ringOffset = RING_CIRC * (1 - countdownPct);

  /** True when 10 or fewer seconds remain — used to switch the ring to red. */
  const isUrgent = countdown <= 10;

  /** Quick lookup map from symbol string to stock metadata (name, sector, etc.) */
  const stockBySymbol = Object.fromEntries(STOCK_POOL.map(s => [s.symbol, s]));

  /** All picks made by the host so far. */
  const hostPicks = room?.picks.filter(p => p.userId === room.hostId) ?? [];

  /** All picks made by the guest so far. */
  const guestPicks = room?.picks.filter(p => p.userId === room.guestId) ?? [];

  /**
   * Display names for each player.
   * "You" refers to whoever is currently logged in, "Opponent" is the other person.
   */
  const hostName = isHost ? 'You' : 'Opponent';
  const guestName = isHost ? 'Opponent' : 'You';

  // Show a full-screen spinner while we're waiting for the room data to load from Firestore
  if (loading || !room) return <LoadingSpinner fullScreen />;

  /**
   * Waiting screen — shown when the room is still in 'waiting' status,
   * meaning the second player hasn't joined yet.
   * The host sees this after creating the room until someone joins.
   */
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

  /**
   * Main draft UI — shown once both players are in the room and the draft is underway.
   *
   * Layout:
   * - Header with the circular countdown timer
   * - "Draft complete" banner once all picks are in (only visible when done)
   * - Stock grid (takes up 2/3 of the width on large screens)
   * - Picks sidebar showing each player's selections and the pick order (1/3 width)
   */
  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] px-4 py-6">
      <div className="max-w-6xl mx-auto">

        {/* Page header — shows title and the circular countdown timer */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Draft</h1>
            <p className="text-[#7a6e60] text-sm mt-0.5">Snake draft · 4 picks each</p>
          </div>

          {/* Circular SVG countdown ring — only shows while draft is in progress */}
          {!draftComplete && (
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-14 h-14">
                {/*
                  SVG ring that drains clockwise as time runs out.
                  We rotate -90deg so it starts draining from the top instead of the right.
                  strokeDashoffset controls how much of the ring is visible.
                */}
                <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90">
                  {/* Background track ring */}
                  <circle cx="26" cy="26" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  {/* Foreground ring that drains as time runs out */}
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
                {/* Countdown number in the center of the ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-mono font-black text-sm tabular-nums ${isUrgent ? 'text-[#ff4560]' : isMyTurn ? 'text-[#c8a882]' : 'text-[#7a6e60]'}`}>
                    {isMyTurn ? countdown : '—'}
                  </span>
                </div>
              </div>
              {/* Label below the ring showing whose turn it is */}
              <p className={`text-[11px] font-medium ${currentPlayerIndex === playerIndex ? 'text-[#c8a882]' : 'text-[#7a6e60]'}`}>
                {currentPlayerIndex === playerIndex ? 'Your pick' : "Opponent's pick"}
              </p>
            </div>
          )}
        </div>

        {/*
          Draft complete banner — appears once all 8 picks are made.
          The host gets a "Start Game" button. The guest just sees a waiting message
          since we don't want the guest to be able to start the game early.
        */}
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

          {/*
            Stock grid — shows all available stocks as clickable cards.
            Cards are disabled if the stock is already picked, draft is done,
            or it's not this player's turn.
            Each card shows the ticker, company name, and current change%.
          */}
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
                    {/*
                      Small initial badge in the top-right corner of picked cards,
                      showing which player picked it (H for host, Y/O for you/opponent).
                    */}
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
                    {/* Show live change% for unpicked stocks */}
                    {pct !== undefined && !isPicked && (
                      <span className={`text-[10px] font-mono font-semibold mt-1.5 inline-block ${isUp ? 'text-[#c8a882]' : 'text-[#ff4560]'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    )}
                    {/* Show who picked it for already-picked stocks */}
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

          {/*
            Right sidebar — shows each player's picks as they come in,
            plus the snake draft pick order indicator at the bottom.
          */}
          <div className="space-y-4">

            {/*
              Pick lists for both players.
              Empty slots show as pulsing placeholder boxes so players
              can see how many picks are left.
            */}
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
                  {/* Filled pick slots */}
                  {picks.map((pick, i) => (
                    <div key={pick.symbol} className="flex items-center gap-2.5 bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2">
                      <span className="text-[#7a6e60] text-xs font-mono w-4 shrink-0">{i + 1}</span>
                      <div>
                        <p className="font-mono font-black text-[#ede8df] text-sm">{pick.symbol}</p>
                        <p className="text-[#7a6e60] text-[10px]">{stockBySymbol[pick.symbol]?.name}</p>
                      </div>
                    </div>
                  ))}
                  {/* Empty placeholder slots for remaining picks */}
                  {Array.from({ length: 4 - picks.length }).map((_, i) => (
                    <div key={i} className="h-[48px] bg-white/[0.02] rounded-lg border border-dashed border-white/[0.06] flex items-center justify-center">
                      <span className="text-[#3a3028] text-xs">Pick {picks.length + i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/*
              Pick order indicator — shows all 8 picks as little circles,
              with the current pick highlighted with a ring.
              Past picks are grayed out, future picks are dim.
            */}
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