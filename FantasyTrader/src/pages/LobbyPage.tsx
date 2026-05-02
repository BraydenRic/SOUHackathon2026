// Lobby — create or join a draft room backed by Firestore

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

type LobbyMode = 'choose' | 'create' | 'join';

const durationLabels: Record<GameDuration, string> = { '1m': '1 Min (test)', '1h': '1 Hour', '1d': '1 Day', '1w': '1 Week' };
const ACTIVE_STATUSES = ['waiting', 'drafting', 'active'] as const;

/** Lobby page — create a Firestore-backed room or join one by code. */
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

  // Subscribe to room once it's created so we can react when a guest joins
  const { room } = useRoom(createdRoomId);

  // Auto-navigate to draft once guest joins
  useEffect(() => {
    if (room?.guestId && room.status === 'drafting') {
      navigate(`/draft/${createdRoomId}`);
    }
  }, [room, createdRoomId, navigate]);

  // Fetch rooms the current user is part of that are still in progress
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
      // Sort newest first
      all.sort((a, b) => b.createdAt - a.createdAt);
      setActiveRooms(all);
    }
    fetchActive();
  }, [user, mode]); // re-fetch when returning to choose screen

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

  async function handleCopy() {
    if (!room?.code) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  function rejoinRoom(r: Room) {
    if (r.status === 'active') navigate(`/game/${r.id}`);
    else navigate(`/draft/${r.id}`);
  }

  return (
    <div className="pt-14 min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-zinc-100 text-3xl font-bold text-center mb-2">Lobby</h1>
        <p className="text-zinc-400 text-center mb-10">Set up a 1v1 draft game with a friend</p>

        {mode === 'choose' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('create')}
                className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/60 rounded-2xl p-8 text-left transition-all cursor-pointer group"
              >
                <div className="text-4xl mb-4"></div>
                <h2 className="text-zinc-100 font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">Create a Room</h2>
                <p className="text-zinc-400 text-sm">Set a duration, get a room code, and wait for a friend to join.</p>
              </button>

              <button
                onClick={() => setMode('join')}
                className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/60 rounded-2xl p-8 text-left transition-all cursor-pointer group"
              >
                <div className="text-4xl mb-4"></div>
                <h2 className="text-zinc-100 font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">Join a Room</h2>
                <p className="text-zinc-400 text-sm">Enter a room code from your friend to jump into their draft.</p>
              </button>
            </div>

            {activeRooms.length > 0 && (
              <div className="mt-8">
                <h2 className="text-zinc-400 text-xs uppercase tracking-wide mb-3">Your Active Games</h2>
                <div className="space-y-2">
                  {activeRooms.map(r => (
                    <div
                      key={r.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={r.status} />
                        <div>
                          <p className="text-zinc-100 text-sm font-medium">
                            {r.hostId === user?.uid ? 'You created' : 'You joined'} · {durationLabels[r.duration]}
                          </p>
                          <p className="text-zinc-500 text-xs font-mono">{r.code}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => rejoinRoom(r)}>
                        Rejoin
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'create' && !createdRoomId && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <button onClick={() => setMode('choose')} className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1 cursor-pointer">
              ← Back
            </button>
            <h2 className="text-zinc-100 font-bold text-xl">Choose Duration</h2>
            <div className="flex gap-3">
              {(['1m', '1h', '1d', '1w'] as GameDuration[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                    duration === d ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {durationLabels[d]}
                </button>
              ))}
            </div>
            {createError && <p className="text-red-400 text-sm text-center">{createError}</p>}
            <Button variant="primary" size="lg" className="w-full" onClick={handleCreate} loading={creating}>
              Create Room
            </Button>
          </div>
        )}

        {mode === 'create' && createdRoomId && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
            <p className="text-zinc-400 text-sm">Share this code with your opponent</p>
            <div className="bg-zinc-800 rounded-2xl py-6 px-8 inline-block mx-auto">
              <p className="text-5xl font-mono font-bold text-emerald-400 tracking-[0.3em]">
                {room?.code ?? '...'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy Code'}
              </Button>
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <span className="h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
                Waiting for opponent…
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <button onClick={() => setMode('choose')} className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1 cursor-pointer">
              ← Back
            </button>
            <h2 className="text-zinc-100 font-bold text-xl">Enter Room Code</h2>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold text-zinc-100 tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase placeholder-zinc-600"
            />
            {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
            <Button variant="primary" size="lg" className="w-full" onClick={handleJoin} loading={joining}>
              Join Room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Room['status'] }) {
  if (status === 'active') return <Badge variant="green">Live</Badge>;
  if (status === 'drafting') return <Badge variant="blue">Drafting</Badge>;
  return <Badge variant="amber">Waiting</Badge>;
}
