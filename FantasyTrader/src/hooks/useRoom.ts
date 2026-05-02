// Subscribes to a Firestore room document with self-contained local state

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Room } from '../types';

/**
 * Subscribes to real-time updates for a room with independent local state.
 * Multiple callers with different roomIds don't conflict with each other.
 * @param roomId - Firestore room document ID
 */
export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !db) { setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'rooms', roomId),
      snap => {
        setRoom(snap.exists() ? (snap.data() as Room) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [roomId]);

  return { room, loading };
}
