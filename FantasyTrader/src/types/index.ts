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
