/**
 * SandboxPage.tsx
 *
 * This is the sandbox page — the solo paper trading mode where users can
 * practice buying and selling stocks without any real money or competitive
 * pressure. Everyone starts with $10,000 in fake cash and can trade from
 * a pool of 20 real stocks using live price data from the Finnhub API.
 *
 * The portfolio is persisted to Firestore so your positions and cash balance
 * are saved between sessions — you can close the tab and come back later
 * and everything will still be there.
 *
 * The page is split into two columns on large screens:
 * - Left side: scrollable list of all available stocks with live prices
 * - Right side: price chart for the selected stock, trade panel, and portfolio summary
 *
 * Below both columns is a transaction history table showing every buy and sell
 * the user has made in this sandbox session.
 *
 * There's also a "Reset Portfolio" button that wipes everything back to the
 * starting $10,000 — useful if you want to start fresh or just made a mess
 * of your portfolio learning how things work.
 */

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

/** All stock symbols from the pool — passed to useStockPrices to subscribe to live data. */
const ALL_SYMBOLS = STOCK_POOL.map(s => s.symbol);

/** The starting cash balance for a fresh sandbox portfolio. */
const INITIAL_CASH = 10_000;

/**
 * dateStr - returns a date string N days ago in YYYY-MM-DD format.
 *
 * Used to calculate the 'from' date when fetching historical chart data
 * from the Polygon/Finnhub API. For example, dateStr(7) gives you the
 * date string for one week ago.
 *
 * @param daysAgo - How many days back from today to go
 * @returns Date string in YYYY-MM-DD format
 */
function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * SandboxPage component
 *
 * The main paper trading interface. Handles:
 * - Loading the user's portfolio from Firestore on mount
 * - Subscribing to live stock prices and syncing them into the portfolio store
 * - Fetching historical chart data when the user selects a stock or changes timeframe
 * - Buy/sell trade execution that updates both local state and Firestore
 * - Portfolio reset with a confirmation step so users don't accidentally wipe it
 */
export default function SandboxPage() {
  /** The currently logged-in user — needed to load/save their specific portfolio. */
  const user = useAuthStore(s => s.user);

  /**
   * Sandbox store — holds all the portfolio state and actions.
   * - cash: how much fake money the user has left to spend
   * - positions: map of symbol -> shares owned and average cost
   * - transactions: full history of every buy/sell
   * - loading: whether the portfolio is still being fetched from Firestore
   * - loadFromFirestore: loads the user's saved portfolio on mount
   * - buy/sell: execute trades and persist them to Firestore
   * - updatePrices: syncs the latest live prices into the positions
   * - reset: wipes the portfolio back to the starting $10,000
   */
  const {
    cash,
    positions,
    transactions,
    loading,
    loadFromFirestore,
    buy,
    sell,
    updatePrices,
    reset
  } = useSandboxStore();

  /** The stock symbol the user has clicked on in the list, or null if nothing is selected. */
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  /** Historical price data for the selected stock, used to render the chart. */
  const [chartData, setChartData] = useState<PricePoint[]>([]);

  /** Whether the chart data is currently being fetched from the API. */
  const [chartLoading, setChartLoading] = useState(false);

  /** The currently selected chart timeframe — 1 day, 1 week, or 1 month. */
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');

  /**
   * Whether the reset confirmation banner is currently visible.
   * We show this as an inline confirmation instead of a modal so it's
   * less disruptive — user clicks "Reset Portfolio", banner appears,
   * they have to click "Reset" again to actually confirm.
   */
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /**
   * Live stock prices for all symbols in the pool.
   * pricesLoading is true while the initial price data is being fetched.
   * Once loaded, we sync these prices into the sandbox store so position
   * values and portfolio totals reflect current market prices.
   */
  const { prices, loading: pricesLoading } = useStockPrices(ALL_SYMBOLS);

  /**
   * Load the user's portfolio from Firestore on mount.
   *
   * We depend on user?.uid so this re-runs if the user somehow changes
   * (like logging out and back in), but in practice it just runs once.
   *
   * The eslint disable is intentional — loadFromFirestore is a store function
   * that doesn't change, so including it in the dependency array isn't necessary
   * and would cause unnecessary re-renders.
   */
  useEffect(() => {
    if (user) loadFromFirestore(user.uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  /**
   * Sync live prices into the portfolio store whenever they update.
   *
   * We wait for pricesLoading to be false before calling updatePrices
   * so we don't sync a partial or empty price object on the first render.
   * updatePrices recalculates the current value of each position based
   * on the latest prices so the portfolio summary stays up to date.
   */
  useEffect(() => {
    if (!pricesLoading) updatePrices(prices);
  }, [prices, pricesLoading, updatePrices]);

  /**
   * fetchChart - fetches historical OHLC price data for a stock and timeframe.
   *
   * Called whenever the user selects a stock or changes the timeframe selector.
   * Maps the timeframe to the appropriate date range and bar interval:
   * - 1D: last 24 hours, minute-level bars
   * - 1W: last 7 days, hourly bars
   * - 1M: last 30 days, daily bars
   *
   * Clears existing chart data before fetching so the chart doesn't show
   * stale data from the previous selection while loading.
   *
   * Wrapped in useCallback so it doesn't get recreated on every render —
   * it's used as a dependency in the effect below.
   *
   * @param symbol - The stock ticker to fetch chart data for
   * @param tf - The timeframe to fetch ('1D', '1W', or '1M')
   */
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
      // If the API call fails just show an empty chart rather than crashing
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  /**
   * Re-fetch chart data whenever the selected symbol or timeframe changes.
   * Only runs if something is actually selected — no point fetching if
   * the user hasn't clicked on a stock yet.
   */
  useEffect(() => {
    if (selectedSymbol) fetchChart(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, fetchChart]);

  /**
   * Look up the full stock metadata (name, sector) for the selected symbol.
   * Used to show the company name below the ticker in the chart header.
   */
  const selectedStock = STOCK_POOL.find(s => s.symbol === selectedSymbol);

  /**
   * Show a simple loading message while the portfolio is being fetched from Firestore.
   * We don't use the full LoadingSpinner here since we want the page chrome to
   * still be visible — just the content area shows a loading state.
   */
  if (loading) return (
    <div className="pt-20 min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Loading portfolio…</div>
    </div>
  );

  return (
    <div className="pt-20 min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Page header with title and reset button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-zinc-100 text-2xl font-bold">Sandbox</h1>
            <p className="text-zinc-400 text-sm">Paper trading with live market data</p>
          </div>
          {/*
            Reset button — opens the confirmation banner below.
            Using 'danger' variant so it's visually distinct and users
            don't accidentally click it.
          */}
          <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
            Reset Portfolio
          </Button>
        </div>

        {/*
          Reset confirmation banner — only visible after clicking "Reset Portfolio".
          Requires a second click to actually confirm, preventing accidental resets.
          Resetting calls reset() from the sandbox store which wipes Firestore
          and sets cash back to $10,000 with no positions.
        */}
        {showResetConfirm && (
          <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-xl p-4 flex items-center justify-between">
            <p className="text-zinc-200 text-sm">
              Reset portfolio to {formatUSD(INITIAL_CASH)}? This cannot be undone.
            </p>
            <div className="flex gap-2 ml-4 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={() => {
                if (user) reset(user.uid);
                setShowResetConfirm(false);
              }}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {/*
          Main two-column layout.
          Left column: stock list (scrollable, fixed height)
          Right column: chart + trade panel + portfolio summary
        */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/*
            Left column — stock list.
            Fixed height based on viewport so it scrolls independently
            without the whole page scrolling. The min-h-0 on the inner
            div is needed to make overflow scroll work correctly inside
            a flex container.
          */}
          <div className="bg-zinc-900 rounded-2xl p-4 h-[calc(100vh-220px)] flex flex-col">
            <h2 className="text-zinc-100 font-semibold mb-3">Markets</h2>
            <div className="flex-1 min-h-0">
              <StockList
                prices={prices}
                selectedSymbol={selectedSymbol}
                onSelect={setSelectedSymbol}
              />
            </div>
          </div>

          {/*
            Right column — chart, trade panel, and portfolio summary.
            Shows a placeholder message if no stock is selected yet.
          */}
          <div className="space-y-4">
            {selectedSymbol ? (
              <>
                {/*
                  Chart card — shows the price chart for the selected stock
                  with timeframe toggle buttons (1D / 1W / 1M).
                  The active timeframe button is highlighted in emerald.
                */}
                <div className="bg-zinc-900 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-zinc-100 font-bold font-mono">{selectedSymbol}</h2>
                      {selectedStock && (
                        <p className="text-zinc-400 text-xs">{selectedStock.name}</p>
                      )}
                    </div>
                    {/* Timeframe toggle buttons */}
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

                {/*
                  Trade panel — buy and sell form for the selected stock.
                  We look up the current price before calling buy/sell so the
                  store always gets the most up-to-date price at trade time.
                  We guard against missing prices with the `if (p && user)` check.
                */}
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
              /* Placeholder shown when no stock is selected yet */
              <div className="bg-zinc-900 rounded-2xl p-8 text-center">
                <p className="text-zinc-500">
                  Select a stock from the list to view its chart and trade.
                </p>
              </div>
            )}

            {/*
              Portfolio summary — always visible regardless of stock selection.
              Shows total portfolio value, cash remaining, and position breakdown.
            */}
            <PortfolioSummary cash={cash} positions={positions} prices={prices} />
          </div>
        </div>

        {/*
          Transaction history table — only rendered if the user has made at least one trade.
          Shows every buy and sell with date, symbol, type, shares, price per share, and total.
          Green left border for buys, red for sells so you can scan it quickly.
          Horizontally scrollable on small screens so the table doesn't break the layout.
        */}
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
                      /* Green left border for buys, red for sells */
                      className={`border-l-2 ${tx.type === 'buy' ? 'border-emerald-500' : 'border-red-500'}`}
                    >
                      <td className="py-2 pl-2 text-zinc-400">
                        {/* Format the timestamp as a short date + time string */}
                        {new Date(tx.timestamp).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-2 font-mono font-bold text-zinc-100">{tx.symbol}</td>
                      <td className={`py-2 capitalize font-medium ${
                        tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.type}
                      </td>
                      <td className="py-2 text-right font-mono text-zinc-200">{tx.shares}</td>
                      <td className="py-2 text-right font-mono text-zinc-200">
                        {formatUSD(tx.pricePerShare)}
                      </td>
                      <td className="py-2 text-right font-mono text-zinc-100 font-medium">
                        {formatUSD(tx.total)}
                      </td>
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