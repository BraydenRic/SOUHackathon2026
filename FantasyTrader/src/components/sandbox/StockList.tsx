// Searchable, filterable list of all 20 stocks

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

/** Searchable, sector-filterable list of all 20 stocks. */
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
        placeholder="Search stocks…"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-2"
      />

      <div className="flex flex-wrap gap-1 mb-3">
        {ALL_SECTORS.map(s => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
              sector === s
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
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
          <p className="text-zinc-500 text-sm text-center py-8">No stocks match your search.</p>
        )}
      </div>
    </div>
  );
}
