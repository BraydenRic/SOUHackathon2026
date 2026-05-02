// Game Zustand store — room writes only (reads handled by useRoom hook)

import { create } from 'zustand';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Room, DraftPick, GameDuration } from '../types';

const DURATION_MS: Record<GameDuration, number> = {
  '1m': 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface GameState {
  error: string | null;
  /** Create a new room and return its Firestore document ID. */
  createRoom: (hostId: string, duration: GameDuration) => Promise<string>;
  /** Look up a room by its short code and add the guest. Returns roomId or null if not found. */
  joinRoomByCode: (code: string, guestId: string) => Promise<string | null>;
  /** Append a draft pick and advance the turn counter. */
  makeDraftPick: (roomId: string, pick: DraftPick) => Promise<void>;
  /** Set room to active and compute the end timestamp from its duration. */
  startGame: (roomId: string) => Promise<void>;
  /** Set room to completed with a winner. */
  completeGame: (roomId: string, winnerId: string | null, hostGainPercent: number, guestGainPercent: number) => Promise<void>;
  /** Update the calling player's own stats after a game completes. Each player calls this for themselves. */
  recordMyResult: (userId: string, winnerId: string | null, coinReward: number) => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  error: null,

  async createRoom(hostId, duration) {
    if (!db) throw new Error('Firestore not initialized');
    set({ error: null });
    const roomRef = doc(collection(db, 'rooms'));
    const room: Room = {
      id: roomRef.id,
      code: randomCode(),
      hostId,
      guestId: null,
      status: 'waiting',
      duration,
      startTime: null,
      endTime: null,
      currentTurn: 0,
      picks: [],
      winnerId: null,
      coinReward: 50,
      createdAt: Date.now(),
    };
    try {
      await setDoc(roomRef, room);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create room';
      set({ error: msg });
      throw e;
    }
    return roomRef.id;
  },

  async joinRoomByCode(code, guestId) {
    if (!db) return null;
    const q = query(collection(db, 'rooms'), where('code', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const roomDoc = snap.docs[0];
    const room = roomDoc.data() as Room;
    if (room.guestId) return null;
    await updateDoc(roomDoc.ref, { guestId, status: 'drafting' });
    return roomDoc.id;
  },

  async makeDraftPick(roomId, pick) {
    if (!db) return;
    await updateDoc(doc(db, 'rooms', roomId), {
      picks: arrayUnion(pick),
      currentTurn: increment(1),
    });
  },

  async startGame(roomId) {
    if (!db) return;
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (!snap.exists()) return;
    const { duration } = snap.data() as Room;
    const now = Date.now();
    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'active',
      startTime: now,
      endTime: now + DURATION_MS[duration],
    });
  },

  async completeGame(roomId, winnerId, hostGainPercent, guestGainPercent) {
    if (!db) return;
    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'completed',
      winnerId,
      hostGainPercent,
      guestGainPercent,
    });
  },

  async recordMyResult(userId, winnerId, coinReward) {
    if (!db) return;
    const isWinner = winnerId === userId;
    const isTie = winnerId === null;
    const outcome = isWinner
      ? { gamesWon: increment(1), coins: increment(coinReward) }
      : isTie
        ? { gamesTied: increment(1) }
        : { gamesLost: increment(1) };
    await updateDoc(doc(db, 'users', userId), { gamesPlayed: increment(1), ...outcome });
    // Write audit record so Profile page can show coin history
    if (isWinner && coinReward > 0) {
      const txRef = doc(collection(db, 'coinTransactions'));
      await setDoc(txRef, {
        id: txRef.id,
        userId,
        amount: coinReward,
        reason: 'Won a draft game',
        timestamp: Date.now(),
      });
    }
  },
}));
