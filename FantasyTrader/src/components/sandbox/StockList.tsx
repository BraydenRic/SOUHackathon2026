import { useState } from 'react';
import { StockRow } from './StockRow';
import { STOCK_POOL } from '../../lib/finnhub';
import type { PricesMap } from '../../types';

interface StockListProps {
  prices: PricesMap;
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}

const ALL_SECTORS = ['All', ...Array.from(new Set(STOCK_POOL.map(s => s.sector))).sort()];

export function StockList({ prices, selectedSymbol, onSelect }: StockListProps) {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');

  const filtered = STOCK_POOL.filter(s => {
    const matchesSector = sector === 'All' || s.sector === sector;
    const q = search.toLowerCase();
    const matchesSearch = !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    return matchesSector && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search…"
        className="w-full bg-[#100e0c] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#ede8df] placeholder-[#3a3028] focus:outline-none focus:border-[rgba(200,168,130,0.35)] transition-colors mb-2.5"
      />

      <div className="flex flex-wrap gap-1.5 mb-3">
        {ALL_SECTORS.map(s => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer ${
              sector === s
                ? 'bg-[rgba(90,138,136,0.1)] text-[#5a8a88] ring-1 ring-[rgba(90,138,136,0.3)]'
                : 'bg-white/[0.03] text-[#7a6e60] hover:text-[#ede8df] hover:bg-white/[0.06] border border-white/[0.06]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
        {filtered.map(stock => (
          <StockRow
            key={stock.symbol}
            stock={stock}
            price={prices[stock.symbol]}
            isSelected={selectedSymbol === stock.symbol}
            onClick={() => onSelect(stock.symbol)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[#7a6e60] text-sm">No stocks match</p>
          </div>
        )}
      </div>
    </div>
  );
}
