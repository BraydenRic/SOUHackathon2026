// Four-metric portfolio overview card

import { useMemo } from 'react';
import { formatUSD, formatSignedPercent } from '../../utils/formatters';
import { calcPortfolioValue, calcNetWorth, calcReturnPercent } from '../../utils/calculations';
import type { PositionsMap, PricesMap } from '../../types';

interface PortfolioSummaryProps {
  cash: number;
  positions: PositionsMap;
  prices: PricesMap;
}

interface MetricCardProps {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative' | 'neutral';
  large?: boolean;
}

function MetricCard({ label, value, highlight = 'neutral', large = false }: MetricCardProps) {
  const valueClass = highlight === 'positive'
    ? 'text-emerald-400'
    : highlight === 'negative'
    ? 'text-red-400'
    : 'text-zinc-100';

  return (
    <div className="bg-zinc-800/60 rounded-xl p-3">
      <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-mono font-bold ${large ? 'text-xl' : 'text-base'} ${valueClass}`}>{value}</p>
    </div>
  );
}

/** Displays cash, portfolio value, net worth, and total return. */
export function PortfolioSummary({ cash, positions, prices }: PortfolioSummaryProps) {
  const portfolioValue = useMemo(() => calcPortfolioValue(positions, prices), [positions, prices]);
  const netWorth = useMemo(() => calcNetWorth(cash, positions, prices), [cash, positions, prices]);
  const returnPct = useMemo(() => calcReturnPercent(positions, prices), [positions, prices]);

  const returnHighlight = returnPct > 0 ? 'positive' : returnPct < 0 ? 'negative' : 'neutral';

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h3 className="text-zinc-100 font-semibold mb-3">Portfolio</h3>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Cash" value={formatUSD(cash)} />
        <MetricCard label="Holdings" value={formatUSD(portfolioValue)} />
        <MetricCard label="Net Worth" value={formatUSD(netWorth)} large />
        <MetricCard
          label="Total Return"
          value={formatSignedPercent(returnPct)}
          highlight={returnHighlight}
          large
        />
      </div>
    </div>
  );
}
