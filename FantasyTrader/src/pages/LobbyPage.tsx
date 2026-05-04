/**
 * LobbyPage.tsx
 *
 * This is the lobby page where players set up or join a 1v1 draft game.
 * It's basically the matchmaking screen — you either create a room and
 * share a code with your friend, or you enter a code to join their room.
 *
 * The page has three different "modes" that swap out the UI:
 * 1. 'choose' — the default view with two big buttons (Create or Join)
 * 2. 'create' — lets you pick a game duration, then creates the room in Firestore
 * 3. 'join' — shows a text input where you type in the room code
 *
 * Once a room is created, the page switches to a waiting screen that shows
 * the room code in big text. As soon as the guest joins and Firestore updates
 * the room status to 'drafting', both players automatically navigate to the draft page.
 *
 * The page also shows any active games the user is already part of at the bottom
 * of the choose screen, so they can rejoin if they accidentally navigated away.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useRoom } from '../hooks/useRoom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { GameDuration, Room } from '../types';

/**
 * The three UI states the lobby can be in.
 * 'choose' = initial screen, 'create' = room creation flow, 'join' = join by code
 */
type LobbyMode = 'choose' | 'create' | 'join';

/**
 * Human-readable labels for each game duration option.
 * '1m' is a quick test mode, the rest are the real game durations.
 */
const durationLabels: Record<GameDuration, string> = {
  '1m': '1 Min (test)',
  '1h': '1 Hour',
  '1d': '1 Day',
  '1w': '1 Week'
};

/**
 * Room statuses that count as "still in progress".
 * Used to filter out completed games when showing active rooms.
 */
const ACTIVE_STATUSES = ['waiting', 'drafting', 'active'] as const;

/**
 * LobbyPage component
 *
 * Manages the full room creation and joining flow.
 * Handles three separate UI modes and switches between them based on user actions.
 *
 * Key behaviors:
 * - Creating a room writes to Firestore and subscribes to that room in real time
 * - When a guest joins, the real-time subscription detects the status change and auto-navigates
 * - Joining a room looks up the code in Firestore and redirects to the draft page
 * - Active games are fetched on load so users can rejoin games they left
 */
const durationLabels: Record<GameDuration, string> = {
  '1m': '1 Min',
  '1h': '1 Hour',
  '1d': '1 Day',
  '1w': '1 Week',
};
const durationDesc: Record<GameDuration, string> = {
  '1m': 'test',
  '1h': 'quick',
  '1d': 'standard',
  '1w': 'marathon',
};

const ACTIVE_STATUSES = ['waiting', 'drafting', 'active'] as const;

export default function LobbyPage() {
  const navigate = useNavigate();

  /** The currently logged-in user. */
  const user = useAuthStore(s => s.user);

  /**
   * createRoom — creates a new room in Firestore and returns the room ID
   * joinRoomByCode — looks up a room by its short code and adds the user as the guest
   */
  const { createRoom, joinRoomByCode } = useGameStore();

  /** Which UI mode we're currently showing (choose / create / join). */
  const [mode, setMode] = useState<LobbyMode>('choose');

  /** The game duration selected by the host before creating a room. Defaults to 1 day. */
  const [duration, setDuration] = useState<GameDuration>('1d');

  /**
   * The Firestore room ID returned after successfully creating a room.
   * Once this is set, we start subscribing to that room via useRoom().
   */
  const [createdRoomId, setCreatedRoomId] = useState('');

  /** The room code typed in by a player trying to join someone else's room. */
  const [joinCode, setJoinCode] = useState('');

  /** Whether the "Copy Code" button was just clicked — briefly shows "✓ Copied!" */
  const [copied, setCopied] = useState(false);

  /** Whether the create room Firestore call is currently in progress. */
  const [creating, setCreating] = useState(false);

  /** Whether the join room Firestore call is currently in progress. */
  const [joining, setJoining] = useState(false);

  /** Error message shown if joining a room fails (e.g. wrong code, room full). */
  const [joinError, setJoinError] = useState('');

  /** Error message shown if creating a room fails for any reason. */
  const [createError, setCreateError] = useState('');

  /**
   * List of rooms the current user is actively part of (waiting, drafting, or active).
   * Shown at the bottom of the choose screen so they can rejoin if needed.
   */
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);

  /**
   * Real-time subscription to the room the host just created.
   * We subscribe to this so we can detect when a guest joins and the status
   * flips to 'drafting', at which point we navigate both players to the draft page.
   *
   * useRoom() returns null room data when createdRoomId is empty, so this
   * is effectively disabled until a room is actually created.
   */
  const { room } = useRoom(createdRoomId);

  /**
   * Auto-navigate to the draft page once a guest joins the created room.
   *
   * Fires whenever the room data updates from Firestore. When the guest joins,
   * Firestore sets guestId and flips the status to 'drafting'. We detect that
   * here and navigate the host to the draft page.
   *
   * The guest gets navigated in handleJoin() below after joinRoomByCode() succeeds.
   */
  const { room } = useRoom(createdRoomId);

  useEffect(() => {
    if (room?.guestId && room.status === 'drafting') {
      navigate(`/draft/${createdRoomId}`);
    }
  }, [room, createdRoomId, navigate]);

  /**
   * Fetch all active rooms the current user is part of.
   *
   * Runs on mount and whenever the mode changes back to 'choose' (so the list
   * refreshes if they just created or joined a room and came back).
   *
   * Like the history page, we have to query as both host and guest separately
   * since Firestore doesn't support OR queries across different fields.
   * We then filter to only keep rooms that are still in progress.
   */
  useEffect(() => {
    if (!user || !db) return;
    async function fetchActive() {
      if (!db || !user) return;
      const [asHost, asGuest] = await Promise.all([
        getDocs(query(collection(db, 'rooms'), where('hostId', '==', user.uid))),
        getDocs(query(collection(db, 'rooms'), where('guestId', '==', user.uid))),
      ]);
      const all = [
        ...asHost.docs.map(d => d.data() as Room),
        ...asGuest.docs.map(d => d.data() as Room),
      ].filter(r => (ACTIVE_STATUSES as readonly string[]).includes(r.status));

      // Show newest rooms first
      all.sort((a, b) => b.createdAt - a.createdAt);
      setActiveRooms(all);
    }
    fetchActive();
  }, [user, mode]);

  /**
   * handleCreate — creates a new draft room in Firestore.
   *
   * Calls createRoom() from the game store with the current user's UID
   * and their selected duration. On success, stores the returned room ID
   * which triggers the real-time subscription and switches the UI to
   * the "waiting for opponent" screen.
   *
   * Shows an error message if the Firestore write fails for any reason.
   */
  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    setCreateError('');
    try {
      const roomId = await createRoom(user.uid, duration);
      setCreatedRoomId(roomId);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }

  /**
   * handleCopy — copies the room code to the user's clipboard.
   *
   * Shows "✓ Copied!" on the button for 2 seconds after copying,
   * then resets back to "Copy Code".
   */
  async function handleCopy() {
    if (!room?.code) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /**
   * handleJoin — looks up a room by code and joins it as the guest.
   *
   * Trims whitespace and uppercases the code before sending it to Firestore
   * since room codes are always uppercase and users might accidentally add spaces.
   *
   * If the room is found and joinable, navigates directly to the draft page.
   * If not (wrong code, room full, already started), shows an error message.
   */
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return; // Don't bother querying for obviously invalid codes
    if (!user) return;
    setJoining(true);
    setJoinError('');
    const roomId = await joinRoomByCode(code, user.uid);
    setJoining(false);
    if (!roomId) {
      setJoinError('Room not found or already full.');
      return;
    }
    navigate(`/draft/${roomId}`);
  }

  /**
   * rejoinRoom — sends the user back to a game they're already part of.
   *
   * If the game is already in the 'active' phase (past the draft), send them
   * to the game page. Otherwise send them back to the draft page.
   *
   * @param r - The room object to rejoin
   */
  function rejoinRoom(r: Room) {
    if (r.status === 'active') navigate(`/game/${r.id}`);
    else navigate(`/draft/${r.id}`);
  }

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908] flex items-center justify-center px-4 py-12"
      style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(200,168,130,0.04) 0%, #0a0908 60%)' }}
    >
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="font-heading font-extrabold text-3xl tracking-tight text-[#ede8df] mb-2">Lobby</h1>
          <p className="text-[#7a6e60] text-sm">Set up a 1v1 draft game with a friend</p>
        </div>

        {/*
          Choose screen — the default landing state of the lobby.
          Shows two big cards: one to create a room, one to join.
          Also shows any active games at the bottom if the user has any.
        */}
        {mode === 'choose' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create a Room card */}
              <button
                onClick={() => setMode('create')}
                className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/60 rounded-2xl p-8 text-left transition-all cursor-pointer group"
              >
                <div className="text-4xl mb-4"></div>
                <h2 className="text-zinc-100 font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">Create a Room</h2>
                <p className="text-zinc-400 text-sm">Set a duration, get a room code, and wait for a friend to join.</p>
              </button>

              {/* Join a Room card */}
              <button
                onClick={() => setMode('join')}
                className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/60 rounded-2xl p-8 text-left transition-all cursor-pointer group"
              >
                <div className="text-4xl mb-4"></div>
                <h2 className="text-zinc-100 font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">Join a Room</h2>
                <p className="text-zinc-400 text-sm">Enter a room code from your friend to jump into their draft.</p>
              </button>
              {[
                {
                  mode: 'create' as LobbyMode,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <path d="M12 8v8M8 12h8"/>
                    </svg>
                  ),
                  title: 'Create a Room',
                  desc: 'Set a duration, get a code, and wait for a friend.',
                  color: '#c8a882',
                  glow: 'rgba(200,168,130,0.06)',
                  border: 'rgba(200,168,130,0.15)',
                },
                {
                  mode: 'join' as LobbyMode,
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                  ),
                  title: 'Join a Room',
                  desc: "Enter a code from your friend to join their draft.",
                  color: '#5a8a88',
                  glow: 'rgba(90,138,136,0.06)',
                  border: 'rgba(90,138,136,0.15)',
                },
              ].map(card => (
                <button
                  key={card.mode}
                  onClick={() => setMode(card.mode)}
                  className="group text-left rounded-2xl p-7 border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  style={{ backgroundColor: card.glow, borderColor: card.border }}
                >
                  <div className="mb-5" style={{ color: card.color }}>{card.icon}</div>
                  <h2 className="font-heading font-bold text-lg text-[#ede8df] mb-1.5 tracking-tight"
                    style={{ transition: 'color 0.15s' }}
                  >
                    {card.title}
                  </h2>
                  <p className="text-[#7a6e60] text-sm leading-relaxed">{card.desc}</p>
                </button>
              ))}
            </div>

            {/*
              Active games section — only shows if the user has at least one
              game in progress. Lets them rejoin without having to start over.
            */}
            {activeRooms.length > 0 && (
              <div className="mt-8">
                <p className="text-[#7a6e60] text-xs uppercase tracking-widest font-medium mb-3">Active Games</p>
                <div className="space-y-2">
                  {activeRooms.map(r => (
                    <div
                      key={r.id}
                      className="bg-[#161311] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {/* Status badge — Live (green), Drafting (blue), or Waiting (amber) */}
                        <StatusBadge status={r.status} />
                        <div>
                          <p className="text-[#ede8df] text-sm font-medium">
                            {r.hostId === user?.uid ? 'You created' : 'You joined'} · {durationLabels[r.duration]}
                          </p>
                          {/* Room code shown in small monospace text below the description */}
                          <p className="text-zinc-500 text-xs font-mono">{r.code}</p>
                          <p className="text-[#7a6e60] text-xs font-mono mt-0.5">{r.code}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => rejoinRoom(r)}>
                        Rejoin →
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/*
          Create room — duration selection screen.
          Only shown when mode is 'create' and a room hasn't been created yet.
          Once handleCreate() succeeds, createdRoomId gets set and this
          switches to the waiting screen below.
        */}
        {mode === 'create' && !createdRoomId && (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-8 space-y-7 animate-scale-in">
            <button onClick={() => setMode('choose')} className="text-[#7a6e60] hover:text-[#ede8df] text-sm flex items-center gap-1.5 cursor-pointer transition-colors">
              ← Back
            </button>
            <h2 className="text-zinc-100 font-bold text-xl">Choose Duration</h2>

            {/* Duration picker — four buttons, selected one turns green */}
            <div className="flex gap-3">
            <div>
              <h2 className="font-heading font-bold text-xl text-[#ede8df] tracking-tight mb-1">Choose Duration</h2>
              <p className="text-[#7a6e60] text-sm">How long will portfolios compete?</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['1m', '1h', '1d', '1w'] as GameDuration[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex flex-col items-center py-3.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                    duration === d
                      ? 'bg-[rgba(200,168,130,0.1)] text-[#c8a882] border border-[rgba(200,168,130,0.25)]'
                      : 'bg-[#1e1a16] text-[#7a6e60] border border-white/[0.06] hover:text-[#ede8df] hover:border-white/[0.12]'
                  }`}
                >
                  <span className="font-mono font-bold">{durationLabels[d]}</span>
                  <span className="text-[10px] mt-0.5 opacity-60">{durationDesc[d]}</span>
                </button>
              ))}
            </div>

            {createError && <p className="text-red-400 text-sm text-center">{createError}</p>}
            {createError && (
              <p className="text-[#ff4560] text-sm text-center">{createError}</p>
            )}
            <Button variant="primary" size="lg" className="w-full" onClick={handleCreate} loading={creating}>
              Create Room
            </Button>
          </div>
        )}

        {/*
          Waiting screen — shown after the room is successfully created.
          Displays the room code in big text so the host can share it.
          The amber pulsing dot indicates we're waiting for someone to join.
          This screen auto-exits once useRoom() detects the guest has joined.
        */}
        {mode === 'create' && createdRoomId && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
            <p className="text-zinc-400 text-sm">Share this code with your opponent</p>

            {/* Big room code display */}
            <div className="bg-zinc-800 rounded-2xl py-6 px-8 inline-block mx-auto">
              <p className="text-5xl font-mono font-bold text-emerald-400 tracking-[0.3em]">
                {room?.code ?? '...'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {/* Copy button — shows confirmation text briefly after clicking */}
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy Code'}
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-8 text-center space-y-7 animate-scale-in">
            <div>
              <p className="text-[#7a6e60] text-sm mb-6">Share this code with your opponent</p>
              <div className="bg-[#100e0c] border border-white/[0.07] rounded-2xl py-8 px-10 inline-block">
                <p className="text-5xl font-mono font-black text-[#c8a882] tracking-[0.35em]"
                  style={{ textShadow: '0 0 40px rgba(200,168,130,0.35)' }}
                >
                  {room?.code ?? '···'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <Button variant="outline" onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy Code'}
              </Button>
              <div className="flex items-center gap-2 text-[#7a6e60] text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c8a882]"
                  style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
                />
                Waiting for opponent…
              </div>
            </div>
          </div>
        )}

        {/*
          Join room screen — shown when mode is 'join'.
          Simple input field for the room code with a join button.
          Shows an error message if the code lookup fails.
        */}
        {mode === 'join' && (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-8 space-y-7 animate-scale-in">
            <button onClick={() => setMode('choose')} className="text-[#7a6e60] hover:text-[#ede8df] text-sm flex items-center gap-1.5 cursor-pointer transition-colors">
              ← Back
            </button>
            <h2 className="text-zinc-100 font-bold text-xl">Enter Room Code</h2>

            {/*
              Room code input — auto-uppercases as the user types since all
              room codes are uppercase. Centered with wide letter spacing to
              match the display style of the code on the host's screen.
            */}
            <div>
              <h2 className="font-heading font-bold text-xl text-[#ede8df] tracking-tight mb-1">Enter Room Code</h2>
              <p className="text-[#7a6e60] text-sm">Get the code from your friend</p>
            </div>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="w-full bg-[#100e0c] border border-white/[0.08] rounded-xl px-4 py-4 text-center text-3xl font-mono font-black text-[#ede8df] tracking-[0.3em] focus:outline-none focus:border-[rgba(200,168,130,0.4)] focus:ring-0 uppercase placeholder-[#3a3028] transition-colors"
            />

            {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
            {joinError && (
              <div className="bg-[rgba(255,69,96,0.08)] border border-[rgba(255,69,96,0.2)] rounded-lg px-4 py-2.5">
                <p className="text-[#ff4560] text-sm text-center">{joinError}</p>
              </div>
            )}
            <Button variant="primary" size="lg" className="w-full" onClick={handleJoin} loading={joining}>
              Join Room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StatusBadge component
 *
 * A small colored badge that shows the current status of a room
 * in the active games list. Makes it easy to see at a glance whether
 * a game is live, in the draft phase, or still waiting for someone to join.
 *
 * @param status - The room's current status from Firestore
 */
function StatusBadge({ status }: { status: Room['status'] }) {
  if (status === 'active') return <Badge variant="green">Live</Badge>;
  if (status === 'drafting') return <Badge variant="blue">Drafting</Badge>;
  return <Badge variant="amber">Waiting</Badge>;
}