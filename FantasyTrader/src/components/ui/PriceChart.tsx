// Recharts area chart for stock price history

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { PricePoint } from '../../types';
import { formatUSD } from '../../utils/formatters';

interface PriceChartProps {
  data: PricePoint[];
  loading?: boolean;
}

interface TooltipPayload {
  value: number;
  payload: PricePoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const { value, payload: point } = payload[0];
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-zinc-100 font-medium">{formatUSD(value)}</p>
      <p className="text-zinc-400 text-xs">{new Date(point.timestamp).toLocaleString()}</p>
    </div>
  );
}

/** Area chart showing price history. Green when price is up from start, red when down. */
export function PriceChart({ data, loading }: PriceChartProps) {
  if (loading) {
    return <div className="h-48 bg-zinc-800/50 rounded-xl animate-pulse" />;
  }

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center bg-zinc-800/30 rounded-xl">
        <p className="text-zinc-500 text-sm">No chart data available</p>
      </div>
    );
  }

  const isUp = data[data.length - 1].price >= data[0].price;
  const color = isUp ? '#10b981' : '#ef4444';

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={v => `$${v}`}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
