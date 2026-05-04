// Lobby page — create or join a 1v1 draft room; shows active games for quick rejoin

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

/** The three views within the lobby: initial choice, room creation, or room join */
type LobbyMode = 'choose' | 'create' | 'join';

/** Human-readable labels for each game duration option */
const durationLabels: Record<GameDuration, string> = {
  '1m': '1 Min',
  '1h': '1 Hour',
  '1d': '1 Day',
  '1w': '1 Week',
};

/** Short descriptor shown below the duration label on the selector buttons */
const durationDesc: Record<GameDuration, string> = {
  '1m': 'test',
  '1h': 'quick',
  '1d': 'standard',
  '1w': 'marathon',
};

/** Room statuses that indicate an in-progress game the user can rejoin */
const ACTIVE_STATUSES = ['waiting', 'drafting', 'active'] as const;

/**
 * LobbyPage — entry point for starting or joining a 1v1 draft game.
 *
 * Flow for creating a room:
 *   1. User picks a duration and clicks "Create Room"
 *   2. `createdRoomId` is set → `useRoom` starts listening to that doc
 *   3. When an opponent joins and status flips to 'drafting', the effect
 *      below navigates both players to the draft page automatically
 *
 * Flow for joining a room:
 *   1. User types the room code and clicks "Join Room"
 *   2. `joinRoomByCode` looks up the room, sets guestId, updates status to 'drafting'
 *   3. On success, navigate directly to /draft/:roomId
 *
 * Active games are fetched on mount (and on mode change) so the user can
 * quickly rejoin a game they navigated away from.
 */
export default function LobbyPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { createRoom, joinRoomByCode } = useGameStore();

  const [mode, setMode] = useState<LobbyMode>('choose');
  const [duration, setDuration] = useState<GameDuration>('1d');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);

  // Real-time listener on the room the host just created — used to detect when a guest joins
  const { room } = useRoom(createdRoomId);

  // When the opponent joins, the room status becomes 'drafting' — navigate to the draft page
  useEffect(() => {
    if (room?.guestId && room.status === 'drafting') {
      navigate(`/draft/${createdRoomId}`);
    }
  }, [room, createdRoomId, navigate]);

  // Fetch the user's active (non-completed) rooms so they can rejoin if needed.
  // Re-runs on mode change so the list refreshes when returning to 'choose'.
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
      // Most recent first
      all.sort((a, b) => b.createdAt - a.createdAt);
      setActiveRooms(all);
    }
    fetchActive();
  }, [user, mode]);

  /** Creates a new room with the selected duration and stores the returned ID */
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

  /** Copies the 6-character room code to the clipboard and shows a brief confirmation */
  async function handleCopy() {
    if (!room?.code) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Validates the join code, calls joinRoomByCode, and navigates to the draft page */
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
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

  /** Routes the user back to the correct page depending on the room's current status */
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

        {/* ── Mode: choose ── initial view with Create / Join cards */}
        {mode === 'choose' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Active games the user can rejoin — only shown if any exist */}
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
                        <StatusBadge status={r.status} />
                        <div>
                          <p className="text-[#ede8df] text-sm font-medium">
                            {r.hostId === user?.uid ? 'You created' : 'You joined'} · {durationLabels[r.duration]}
                          </p>
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

        {/* ── Mode: create — step 1: duration picker (before room is created) */}
        {mode === 'create' && !createdRoomId && (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-8 space-y-7 animate-scale-in">
            <button onClick={() => setMode('choose')} className="text-[#7a6e60] hover:text-[#ede8df] text-sm flex items-center gap-1.5 cursor-pointer transition-colors">
              ← Back
            </button>
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
            {createError && (
              <p className="text-[#ff4560] text-sm text-center">{createError}</p>
            )}
            <Button variant="primary" size="lg" className="w-full" onClick={handleCreate} loading={creating}>
              Create Room
            </Button>
          </div>
        )}

        {/* ── Mode: create — step 2: room code display, waiting for opponent */}
        {mode === 'create' && createdRoomId && (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-8 text-center space-y-7 animate-scale-in">
            <div>
              <p className="text-[#7a6e60] text-sm mb-6">Share this code with your opponent</p>
              {/* Large monospaced code display — wide letter-spacing makes it easy to read aloud */}
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
              {/* Pulsing dot signals that the page is actively watching for the opponent */}
              <div className="flex items-center gap-2 text-[#7a6e60] text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c8a882]"
                  style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
                />
                Waiting for opponent…
              </div>
            </div>
          </div>
        )}

        {/* ── Mode: join — code entry form */}
        {mode === 'join' && (
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-8 space-y-7 animate-scale-in">
            <button onClick={() => setMode('choose')} className="text-[#7a6e60] hover:text-[#ede8df] text-sm flex items-center gap-1.5 cursor-pointer transition-colors">
              ← Back
            </button>
            <div>
              <h2 className="font-heading font-bold text-xl text-[#ede8df] tracking-tight mb-1">Enter Room Code</h2>
              <p className="text-[#7a6e60] text-sm">Get the code from your friend</p>
            </div>
            {/* Auto-uppercased input — mirrors how codes are stored in Firestore */}
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="w-full bg-[#100e0c] border border-white/[0.08] rounded-xl px-4 py-4 text-center text-3xl font-mono font-black text-[#ede8df] tracking-[0.3em] focus:outline-none focus:border-[rgba(200,168,130,0.4)] focus:ring-0 uppercase placeholder-[#3a3028] transition-colors"
            />
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
 * StatusBadge — maps a room status string to a coloured Badge variant.
 * Shown next to each active game in the rejoin list.
 */
function StatusBadge({ status }: { status: Room['status'] }) {
  if (status === 'active') return <Badge variant="green">Live</Badge>;
  if (status === 'drafting') return <Badge variant="blue">Drafting</Badge>;
  return <Badge variant="amber">Waiting</Badge>;
}
