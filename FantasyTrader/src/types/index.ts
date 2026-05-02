// Shared TypeScript interfaces used across the entire app

export interface StockMeta {
  symbol: string;
  name: string;
  sector: string;
}

export interface StockPrice {
  symbol: string;
  price: number;
  prevClose: number;
  changePercent: number;
  lastUpdated: number;
  stale?: boolean;
}

export type PricesMap = Record<string, StockPrice>;

export interface PricePoint {
  timestamp: number;
  price: number;
}

export type Timeframe = '1D' | '1W' | '1M';

export interface SandboxPosition {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
}

export type PositionsMap = Record<string, SandboxPosition>;

export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  total: number;
  timestamp: number;
}

export interface SandboxState {
  cash: number;
  positions: PositionsMap;
  transactions: Transaction[];
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coins: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesTied: number;
  createdAt: number;
}

export interface DraftPick {
  userId: string;
  symbol: string;
  pickNumber: number;
  draftPrice: number;
}

export type RoomStatus = 'waiting' | 'drafting' | 'active' | 'completed';
export type GameDuration = '1m' | '1h' | '1d' | '1w';

export interface Room {
  id: string;
  code: string;
  hostId: string;
  guestId: string | null;
  status: RoomStatus;
  duration: GameDuration;
  startTime: number | null;
  endTime: number | null;
  currentTurn: number;
  picks: DraftPick[];
  winnerId: string | null;
  coinReward: number;
  createdAt: number;
  hostGainPercent?: number;
  guestGainPercent?: number;
}

export interface GamePortfolio {
  userId: string;
  roomId: string;
  picks: DraftPick[];
  currentValue: number;
  startValue: number;
  gainPercent: number;
}
