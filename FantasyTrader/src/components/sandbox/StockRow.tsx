import { memo } from 'react';
import { formatUSD, formatSignedPercent } from '../../utils/formatters';
import type { StockMeta, StockPrice } from '../../types';

interface StockRowProps {
  stock: StockMeta;
  price: StockPrice | undefined;
  isSelected: boolean;
  onClick: () => void;
}

export const StockRow = memo(function StockRow({ stock, price, isSelected, onClick }: StockRowProps) {
  const isUp = price ? price.changePercent >= 0 : true;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-all duration-150 cursor-pointer group border-b border-white/[0.04] last:border-0 ${
        isSelected
          ? 'bg-[rgba(200,168,130,0.07)] ring-1 ring-inset ring-[rgba(200,168,130,0.25)] rounded-lg'
          : 'hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex flex-col min-w-0">
        <span className="font-mono font-bold text-[#ede8df] text-sm tracking-tight">{stock.symbol}</span>
        <span className="text-[#7a6e60] text-[11px] truncate mt-0.5">{stock.name}</span>
      </div>

      <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
        {price ? (
          <>
            <span className={`font-mono text-sm font-semibold tabular-nums ${price.stale ? 'text-[#7a6e60]' : 'text-[#ede8df]'}`}>
              {formatUSD(price.price)}
            </span>
            <span className={`text-[11px] font-mono font-semibold tabular-nums px-1.5 py-0.5 rounded-full ${
              isUp
                ? 'text-[#22c55e] bg-[rgba(34,197,94,0.1)]'
                : 'text-[#ff4560] bg-[rgba(255,69,96,0.1)]'
            }`}>
              {formatSignedPercent(price.changePercent)}
            </span>
          </>
        ) : (
          <>
            <span className="h-4 w-14 bg-white/[0.06] rounded animate-pulse" />
            <span className="h-3.5 w-10 bg-white/[0.04] rounded-full animate-pulse" />
          </>
        )}
      </div>
    </button>
  );
});
