// Lobby — create or join a draft room

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

type LobbyMode = 'choose' | 'create' | 'join';
type Duration = '1h' | '1d' | '1w';

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Lobby page for creating or joining a draft room. */
export default function LobbyPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LobbyMode>('choose');
  const [duration, setDuration] = useState<Duration>('1d');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);

  function handleCreate() {
    const code = randomCode();
    setRoomCode(code);
    setWaiting(true);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleJoin() {
    if (joinCode.trim().length < 4) return;
    navigate('/draft');
  }

  const durationLabels: Record<Duration, string> = { '1h': '1 Hour', '1d': '1 Day', '1w': '1 Week' };

  return (
    <div className="pt-14 min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-zinc-100 text-3xl font-bold text-center mb-2">Lobby</h1>
        <p className="text-zinc-400 text-center mb-10">Set up a 1v1 draft game with a friend</p>

        {mode === 'choose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('create')}
              className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/60 rounded-2xl p-8 text-left transition-all cursor-pointer group"
            >
              <div className="text-4xl mb-4">🏠</div>
              <h2 className="text-zinc-100 font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">
                Create a Room
              </h2>
              <p className="text-zinc-400 text-sm">
                Set a duration, get a room code, and wait for a friend to join.
              </p>
            </button>

            <button
              onClick={() => setMode('join')}
              className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800/60 rounded-2xl p-8 text-left transition-all cursor-pointer group"
            >
              <div className="text-4xl mb-4">🚪</div>
              <h2 className="text-zinc-100 font-bold text-xl mb-2 group-hover:text-emerald-400 transition-colors">
                Join a Room
              </h2>
              <p className="text-zinc-400 text-sm">
                Enter a room code from your friend to jump into their draft.
              </p>
            </button>
          </div>
        )}

        {mode === 'create' && !waiting && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <button onClick={() => setMode('choose')} className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1 cursor-pointer">
              ← Back
            </button>
            <h2 className="text-zinc-100 font-bold text-xl">Choose Duration</h2>
            <div className="flex gap-3">
              {(['1h', '1d', '1w'] as Duration[]).map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                    duration === d
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {durationLabels[d]}
                </button>
              ))}
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={handleCreate}>
              Create Room
            </Button>
          </div>
        )}

        {mode === 'create' && waiting && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
            <p className="text-zinc-400 text-sm">Share this code with your opponent</p>
            <div className="bg-zinc-800 rounded-2xl py-6 px-8 inline-block mx-auto">
              <p className="text-5xl font-mono font-bold text-emerald-400 tracking-[0.3em]">{roomCode}</p>
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
            {/* For the prototype, let the host start directly */}
            <Button variant="primary" onClick={() => navigate('/draft')}>
              Start Draft (demo)
            </Button>
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
            <Button variant="primary" size="lg" className="w-full" onClick={handleJoin}>
              Join Room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
