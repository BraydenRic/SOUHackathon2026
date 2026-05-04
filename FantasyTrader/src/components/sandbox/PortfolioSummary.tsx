// Displays a 4-stat summary card (Cash, Holdings, Net Worth, Total Return)
// for the sandbox portfolio

import { useMemo } from 'react';
import { formatUSD, formatSignedPercent } from '../../utils/formatters';
import { calcPortfolioValue, calcNetWorth, calcReturnPercent } from '../../utils/calculations';
import type { PositionsMap, PricesMap } from '../../types';

interface PortfolioSummaryProps {
  cash: number;
  positions: PositionsMap;
  prices: PricesMap;
}

/** Memoized portfolio summary card showing cash, holdings value, net worth, and return %. */
export function PortfolioSummary({ cash, positions, prices }: PortfolioSummaryProps) {
  const portfolioValue = useMemo(() => calcPortfolioValue(positions, prices), [positions, prices]);
  const netWorth = useMemo(() => calcNetWorth(cash, positions, prices), [cash, positions, prices]);
  const returnPct = useMemo(() => calcReturnPercent(positions, prices), [positions, prices]);

  const isUp = returnPct >= 0;

  return (
    <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-5">
      <p className="text-[#7a6e60] text-xs font-medium uppercase tracking-widest mb-4">Portfolio</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Cash', value: formatUSD(cash), color: 'text-[#ede8df]' },
          { label: 'Holdings', value: formatUSD(portfolioValue), color: 'text-[#ede8df]' },
          { label: 'Net Worth', value: formatUSD(netWorth), color: 'text-[#ede8df]', large: true },
          {
            label: 'Total Return',
            value: formatSignedPercent(returnPct),
            color: isUp ? 'text-[#22c55e]' : 'text-[#ff4560]',
            large: true,
          },
        ].map(m => (
          <div key={m.label} className="bg-[#100e0c] rounded-xl p-3.5">
            <p className="text-[#7a6e60] text-[11px] uppercase tracking-wide mb-1.5">{m.label}</p>
            <p className={`font-mono font-bold tabular-nums ${m.large ? 'text-lg' : 'text-sm'} ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
