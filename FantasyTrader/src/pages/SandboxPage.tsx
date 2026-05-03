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

  if (loading) return (
    <div className="pt-14 min-h-screen bg-[#0a0908] flex items-center justify-center">
      <p className="text-[#7a6e60] text-sm">Loading portfolio…</p>
    </div>
  );

  return (
    <div className="pt-14 min-h-screen bg-[#0a0908]">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-[#ede8df]">Sandbox</h1>
            <p className="text-[#7a6e60] text-sm mt-0.5">Paper trading · live prices · no risk</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
            Reset
          </Button>
        </div>

        {/* Reset confirm */}
        {showResetConfirm && (
          <div className="mb-5 bg-[rgba(255,69,96,0.06)] border border-[rgba(255,69,96,0.2)] rounded-xl px-5 py-3.5 flex items-center justify-between">
            <p className="text-[#ede8df] text-sm">
              Reset portfolio to <span className="font-mono font-semibold">{formatUSD(INITIAL_CASH)}</span>? Cannot be undone.
            </p>
            <div className="flex gap-2 ml-4 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={() => {
                if (user) reset(user.uid);
                setShowResetConfirm(false);
              }}>
                Confirm Reset
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Markets */}
          <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-4 h-[calc(100vh-200px)] flex flex-col">
            <p className="text-[#7a6e60] text-xs font-medium uppercase tracking-widest mb-3">Markets</p>
            <div className="flex-1 min-h-0">
              <StockList prices={prices} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {selectedSymbol ? (
              <>
                {/* Chart */}
                <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-mono font-black text-[#ede8df] text-lg tracking-tight">{selectedSymbol}</h2>
                      {selectedStock && <p className="text-[#7a6e60] text-xs mt-0.5">{selectedStock.name}</p>}
                    </div>
                    <div className="flex gap-1 bg-[#100e0c] rounded-lg p-1">
                      {(['1D', '1W', '1M'] as Timeframe[]).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            timeframe === tf
                              ? 'bg-[rgba(200,168,130,0.12)] text-[#c8a882]'
                              : 'text-[#7a6e60] hover:text-[#ede8df]'
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
              <div className="bg-[#161311] border border-white/[0.07] rounded-2xl p-10 text-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-[#7a6e60]" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2 14 L6 9 L9.5 11.5 L14 6 L18 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[#7a6e60] text-sm">Select a stock to view its chart and trade</p>
              </div>
            )}

            <PortfolioSummary cash={cash} positions={positions} prices={prices} />
          </div>
        </div>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <div className="mt-5 bg-[#161311] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-[#7a6e60] text-xs font-medium uppercase tracking-widest mb-4">Transactions</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#7a6e60] text-[11px] uppercase tracking-widest border-b border-white/[0.06]">
                    <th className="text-left pb-3 font-medium">Date</th>
                    <th className="text-left pb-3 font-medium">Symbol</th>
                    <th className="text-left pb-3 font-medium">Type</th>
                    <th className="text-right pb-3 font-medium">Shares</th>
                    <th className="text-right pb-3 font-medium">Price</th>
                    <th className="text-right pb-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 text-[#7a6e60] text-xs">
                        {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 font-mono font-black text-[#ede8df] text-sm">{tx.symbol}</td>
                      <td className={`py-2.5 capitalize font-semibold text-xs ${tx.type === 'buy' ? 'text-[#c8a882]' : 'text-[#ff4560]'}`}>
                        {tx.type}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[#ede8df] tabular-nums">{tx.shares}</td>
                      <td className="py-2.5 text-right font-mono text-[#ede8df] tabular-nums">{formatUSD(tx.pricePerShare)}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-[#ede8df] tabular-nums">{formatUSD(tx.total)}</td>
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
