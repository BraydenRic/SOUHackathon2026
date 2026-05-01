// Single row in the stock list — memoized to prevent re-renders on every price tick

import { memo } from 'react';
import { Badge } from '../ui/Badge';
import { formatUSD, formatSignedPercent } from '../../utils/formatters';
import type { StockMeta, StockPrice } from '../../types';

interface StockRowProps {
  stock: StockMeta;
  price: StockPrice | undefined;
  isSelected: boolean;
  onClick: () => void;
}

/** Displays one stock in the stock list with price and change percent. Wrapped in React.memo. */
export const StockRow = memo(function StockRow({ stock, price, isSelected, onClick }: StockRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
        isSelected ? 'bg-zinc-700/60 ring-1 ring-zinc-600' : 'hover:bg-zinc-800/60'
      }`}
    >
      <div className="flex flex-col min-w-0">
        <span className="font-mono font-bold text-zinc-100 text-sm">{stock.symbol}</span>
        <span className="text-zinc-400 text-xs truncate">{stock.name}</span>
      </div>

      <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
        {price ? (
          <>
            <span className={`font-mono text-sm font-medium ${price.stale ? 'text-zinc-500' : 'text-zinc-100'}`}>
              {formatUSD(price.price)}
              {price.stale && <span className="text-xs text-zinc-600 ml-1">stale</span>}
            </span>
            <Badge variant={price.changePercent >= 0 ? 'green' : 'red'}>
              {formatSignedPercent(price.changePercent)}
            </Badge>
          </>
        ) : (
          <>
            <span className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
            <span className="h-4 w-12 bg-zinc-700 rounded animate-pulse" />
          </>
        )}
      </div>
    </button>
  );
});
