// Auth Zustand store — Google sign-in, user document creation, and session state

import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, increment, collection, writeBatch } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  /** Set up onAuthStateChanged listener. Call once in App; use return value as cleanup. */
  initialize: () => () => void;
  /** Open Google sign-in popup. */
  signInWithGoogle: () => Promise<void>;
  /** Sign out and clear state. */
  signOutUser: () => Promise<void>;
  /** Re-fetch the user document from Firestore. */
  refreshUser: () => Promise<void>;
  /** Buy a title for the first time — deducts coins, adds to purchasedTitles, and equips it. */
  purchaseTitle: (titleId: string, cost: number, label: string) => Promise<void>;
  /** Switch to an already-owned title (free). */
  equipTitle: (titleId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,

  initialize() {
    if (!auth) return () => {};
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) {
        set({ user: null, firebaseUser: null, loading: false });
        return;
      }
      set({ firebaseUser: fbUser });
      // Build a fallback user from Firebase Auth in case Firestore is unreachable
      const fallback: User = {
        uid: fbUser.uid,
        email: fbUser.email ?? '',
        displayName: fbUser.displayName ?? 'Player',
        photoURL: fbUser.photoURL ?? undefined,
        coins: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesTied: 0,
        createdAt: Date.now(),
      };
      if (!db) { set({ user: fallback, loading: false }); return; }
      try {
        const ref = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, fallback);
          set({ user: fallback, loading: false });
        } else {
          set({ user: { ...fallback, ...snap.data() } as User, loading: false });
        }
      } catch {
        // Firestore unavailable — still let the user in with auth data
        set({ user: fallback, loading: false });
      }
    });
    return unsub;
  },

  async signInWithGoogle() {
    if (!auth) return;
    set({ error: null });
    try {
      if (import.meta.env.DEV) {
        await signInWithPopup(auth, googleProvider);
      } else {
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      set({ error: msg });
    }
  },

  async signOutUser() {
    if (!auth) return;
    await signOut(auth);
    set({ user: null, firebaseUser: null });
  },

  async refreshUser() {
    const { firebaseUser } = get();
    if (!firebaseUser || !db) return;
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (snap.exists()) set({ user: { gamesLost: 0, gamesTied: 0, ...snap.data() } as User });
  },

  async purchaseTitle(titleId, cost, label) {
    const { firebaseUser } = get();
    if (!firebaseUser || !db) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', firebaseUser.uid);
    // Deduct coins, add to owned list, equip immediately
    batch.update(userRef, {
      coins: increment(-cost),
      purchasedTitles: arrayUnion(titleId),
      title: titleId,
    });
    // Coin transaction for profile history
    const txRef = doc(collection(db, 'coinTransactions'));
    batch.set(txRef, {
      id: txRef.id,
      userId: firebaseUser.uid,
      amount: -cost,
      reason: `Purchased title: ${label}`,
      timestamp: Date.now(),
    });
    await batch.commit();
    await get().refreshUser();
  },

  async equipTitle(titleId) {
    const { firebaseUser } = get();
    if (!firebaseUser || !db) return;
    await updateDoc(doc(db, 'users', firebaseUser.uid), { title: titleId });
    await get().refreshUser();
  },
}));
