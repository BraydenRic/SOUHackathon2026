// Buy/sell panel for a selected stock

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { formatUSD, formatSignedPercent } from '../../utils/formatters';
import type { StockPrice, SandboxPosition } from '../../types';

interface TradePanelProps {
  symbol: string;
  price: StockPrice | undefined;
  position: SandboxPosition | undefined;
  cash: number;
  onBuy: (symbol: string, shares: number) => void;
  onSell: (symbol: string, shares: number) => void;
}

/** Trade panel for buying and selling shares of the selected stock. */
export function TradePanel({ symbol, price, position, cash, onBuy, onSell }: TradePanelProps) {
  const [sharesInput, setSharesInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Debounce validation so it doesn't flash errors while typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsedShares = parseFloat(sharesInput);
  const validShares = !isNaN(parsedShares) && parsedShares > 0;
  const estimatedCost = validShares && price ? parsedShares * price.price : 0;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!sharesInput) { setError(null); return; }
      if (!validShares) { setError('Enter a valid number of shares'); return; }
      setError(null);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sharesInput, validShares]);

  function handleBuy() {
    if (!validShares || !price) return;
    if (estimatedCost > cash) { setError(`Not enough cash (need ${formatUSD(estimatedCost)})`); return; }
    onBuy(symbol, parsedShares);
    setSharesInput('');
    setError(null);
  }

  function handleSell() {
    if (!validShares || !price) return;
    if (!position || parsedShares > position.shares) {
      setError(`You only own ${position?.shares ?? 0} shares`);
      return;
    }
    onSell(symbol, parsedShares);
    setSharesInput('');
    setError(null);
  }

  const unrealizedPnL = position && price
    ? (price.price - position.avgCost) * position.shares
    : null;

  return (
    <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-zinc-100 font-bold font-mono">{symbol}</h3>
          {price && (
            <p className="text-2xl font-bold text-zinc-100 mt-0.5">{formatUSD(price.price)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-zinc-400 text-xs">Cash available</p>
          <p className="text-zinc-100 font-medium">{formatUSD(cash)}</p>
        </div>
      </div>

      {position && (
        <div className="bg-zinc-800/60 rounded-lg px-3 py-2.5 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-400">Shares held</span>
            <span className="text-zinc-100 font-mono">{position.shares}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Avg cost</span>
            <span className="text-zinc-100 font-mono">{formatUSD(position.avgCost)}</span>
          </div>
          {unrealizedPnL !== null && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Unrealized P&L</span>
              <span className={`font-mono ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}{formatUSD(unrealizedPnL)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-zinc-400 text-xs uppercase tracking-wide">Shares</label>
        <input
          type="number"
          min="0"
          step="1"
          value={sharesInput}
          onChange={e => setSharesInput(e.target.value)}
          placeholder="0"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {validShares && price && (
          <p className="text-zinc-400 text-xs">
            Estimated: <span className="text-zinc-200 font-mono">{formatUSD(estimatedCost)}</span>
          </p>
        )}
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={!validShares || !price}
          onClick={handleBuy}
        >
          Buy
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          disabled={!validShares || !price || !position}
          onClick={handleSell}
        >
          Sell
        </Button>
      </div>

      {position && price && (
        <p className="text-zinc-500 text-xs text-center">
          Return: <span className={unrealizedPnL! >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {formatSignedPercent(((price.price - position.avgCost) / position.avgCost) * 100)}
          </span>
        </p>
      )}
    </div>
  );
}
