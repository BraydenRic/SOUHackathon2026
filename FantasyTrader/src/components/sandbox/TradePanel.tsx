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

export function TradePanel({ symbol, price, position, cash, onBuy, onSell }: TradePanelProps) {
  const [sharesInput, setSharesInput] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    if (estimatedCost > cash) { setError(`Need ${formatUSD(estimatedCost)} — only ${formatUSD(cash)} available`); return; }
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
    <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono font-black text-[#ede8df] text-lg tracking-tight">{symbol}</p>
          {price && (
            <p className="text-2xl font-bold tabular-nums text-[#ede8df] mt-0.5">{formatUSD(price.price)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[#7a6e60] text-xs mb-1">Available</p>
          <p className="text-[#ede8df] font-mono font-semibold text-sm tabular-nums">{formatUSD(cash)}</p>
        </div>
      </div>

      {position && (
        <div className="bg-[#100e0c] rounded-xl px-4 py-3 space-y-2">
          {[
            { label: 'Shares', value: String(position.shares) },
            { label: 'Avg cost', value: formatUSD(position.avgCost) },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-[#7a6e60]">{r.label}</span>
              <span className="text-[#ede8df] font-mono tabular-nums">{r.value}</span>
            </div>
          ))}
          {unrealizedPnL !== null && (
            <div className="flex justify-between text-sm pt-1 border-t border-white/[0.05]">
              <span className="text-[#7a6e60]">Unrealized P&L</span>
              <span className={`font-mono font-semibold tabular-nums ${unrealizedPnL >= 0 ? 'text-[#c8a882]' : 'text-[#ff4560]'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}{formatUSD(unrealizedPnL)}
                <span className="text-xs ml-1 opacity-70">
                  ({formatSignedPercent(((price!.price - position.avgCost) / position.avgCost) * 100)})
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[#7a6e60] text-xs font-medium uppercase tracking-widest">Shares</label>
        <input
          type="number"
          min="0"
          step="1"
          value={sharesInput}
          onChange={e => setSharesInput(e.target.value)}
          placeholder="0"
          className="w-full bg-[#100e0c] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[#ede8df] text-sm font-mono tabular-nums focus:outline-none focus:border-[rgba(200,168,130,0.4)] transition-colors"
        />
        {validShares && price && (
          <p className="text-[#7a6e60] text-xs">
            Est. cost: <span className="text-[#ede8df] font-mono">{formatUSD(estimatedCost)}</span>
          </p>
        )}
        {error && <p className="text-[#ff4560] text-xs">{error}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" disabled={!validShares || !price} onClick={handleBuy}>
          Buy
        </Button>
        <Button variant="danger" className="flex-1" disabled={!validShares || !price || !position} onClick={handleSell}>
          Sell
        </Button>
      </div>
    </div>
  );
}
