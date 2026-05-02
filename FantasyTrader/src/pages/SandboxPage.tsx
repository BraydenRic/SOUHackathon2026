// Sandbox mode — solo paper trading with live prices and Firestore persistence

import { useEffect, useState, useCallback } from 'react';
import { StockList } from '../components/sandbox/StockList';
import { TradePanel } from '../components/sandbox/TradePanel';
import { PortfolioSummary } from '../components/sandbox/PortfolioSummary';
import { PriceChart } from '../components/ui/PriceChart';
import { Button } from '../components/ui/Button';
import { useStockPrices } from '../hooks/useStockPrices';
import { useAuthStore } from '../store/authStore';
import { useSandboxStore } from '../store/sandboxStore';
import { STOCK_POOL, fetchAggBars } from '../lib/finnhub';
import type { PricePoint, Timeframe } from '../types';
import { formatUSD } from '../utils/formatters';

const ALL_SYMBOLS = STOCK_POOL.map(s => s.symbol);
const INITIAL_CASH = 10_000;

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/** Sandbox page — paper trading with live prices and Firestore-persisted portfolio. */
export default function SandboxPage() {
  const user = useAuthStore(s => s.user);
  const { cash, positions, transactions, loading, loadFromFirestore, buy, sell, updatePrices, reset } = useSandboxStore();

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { prices, loading: pricesLoading } = useStockPrices(ALL_SYMBOLS);

  useEffect(() => {
    if (user) loadFromFirestore(user.uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!pricesLoading) updatePrices(prices);
  }, [prices, pricesLoading, updatePrices]);

  const fetchChart = useCallback(async (symbol: string, tf: Timeframe) => {
    setChartLoading(true);
    setChartData([]);
    try {
      let from: string, to: string, timespan: 'minute' | 'hour' | 'day';
      const today = dateStr(0);
      if (tf === '1D') { from = dateStr(1); to = today; timespan = 'minute'; }
      else if (tf === '1W') { from = dateStr(7); to = today; timespan = 'hour'; }
      else { from = dateStr(30); to = today; timespan = 'day'; }
      const data = await fetchAggBars(symbol, from, to, timespan);
      setChartData(data);
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSymbol) fetchChart(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, fetchChart]);

  const selectedStock = STOCK_POOL.find(s => s.symbol === selectedSymbol);

  if (loading) return <div className="pt-20 min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-zinc-400">Loading portfolio…</div></div>;

  return (
    <div className="pt-20 min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-zinc-100 text-2xl font-bold">Sandbox</h1>
            <p className="text-zinc-400 text-sm">Paper trading with live market data</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
            Reset Portfolio
          </Button>
        </div>

        {showResetConfirm && (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-zinc-200 text-sm">Reset portfolio to {formatUSD(INITIAL_CASH)}? This cannot be undone.</p>
            <div className="flex gap-2 ml-4 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={() => {
                if (user) reset(user.uid);
                setShowResetConfirm(false);
              }}>
                Reset
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-2xl p-4 h-[calc(100vh-220px)] flex flex-col">
            <h2 className="text-zinc-100 font-semibold mb-3">Markets</h2>
            <div className="flex-1 min-h-0">
              <StockList prices={prices} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
            </div>
          </div>

          <div className="space-y-4">
            {selectedSymbol ? (
              <>
                <div className="bg-zinc-900 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-zinc-100 font-bold font-mono">{selectedSymbol}</h2>
                      {selectedStock && <p className="text-zinc-400 text-xs">{selectedStock.name}</p>}
                    </div>
                    <div className="flex gap-1">
                      {(['1D', '1W', '1M'] as Timeframe[]).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            timeframe === tf
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <PriceChart data={chartData} loading={chartLoading} />
                </div>

                <TradePanel
                  symbol={selectedSymbol}
                  price={prices[selectedSymbol]}
                  position={positions[selectedSymbol]}
                  cash={cash}
                  onBuy={(sym, shares) => {
                    const p = prices[sym]?.price;
                    if (p && user) buy(sym, shares, p, user.uid);
                  }}
                  onSell={(sym, shares) => {
                    const p = prices[sym]?.price;
                    if (p && user) sell(sym, shares, p, user.uid);
                  }}
                />
              </>
            ) : (
              <div className="bg-zinc-900 rounded-2xl p-8 text-center">
                <p className="text-zinc-500">Select a stock from the list to view its chart and trade.</p>
              </div>
            )}

            <PortfolioSummary cash={cash} positions={positions} prices={prices} />
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="mt-6 bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-zinc-100 font-semibold mb-3">Transaction History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wide border-b border-zinc-800">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-left pb-2 font-medium">Symbol</th>
                    <th className="text-left pb-2 font-medium">Type</th>
                    <th className="text-right pb-2 font-medium">Shares</th>
                    <th className="text-right pb-2 font-medium">Price</th>
                    <th className="text-right pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr
                      key={tx.id}
                      className={`border-l-2 ${tx.type === 'buy' ? 'border-emerald-500' : 'border-red-500'}`}
                    >
                      <td className="py-2 pl-2 text-zinc-400">
                        {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2 font-mono font-bold text-zinc-100">{tx.symbol}</td>
                      <td className={`py-2 capitalize font-medium ${tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type}
                      </td>
                      <td className="py-2 text-right font-mono text-zinc-200">{tx.shares}</td>
                      <td className="py-2 text-right font-mono text-zinc-200">{formatUSD(tx.pricePerShare)}</td>
                      <td className="py-2 text-right font-mono text-zinc-100 font-medium">{formatUSD(tx.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}