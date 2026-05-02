// Finnhub API client — OHLCV candle history for price charts

import type { StockMeta, PricePoint } from '../types';

export const STOCK_POOL: StockMeta[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',              sector: 'Technology'   },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',          sector: 'Technology'   },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',            sector: 'Technology'   },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',          sector: 'Consumer'     },
  { symbol: 'TSLA',  name: 'Tesla Inc.',               sector: 'Automotive'   },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',             sector: 'Technology'   },
  { symbol: 'META',  name: 'Meta Platforms Inc.',      sector: 'Technology'   },
  { symbol: 'JPM',   name: 'JPMorgan Chase',           sector: 'Finance'      },
  { symbol: 'V',     name: 'Visa Inc.',                sector: 'Finance'      },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',        sector: 'Healthcare'   },
  { symbol: 'WMT',   name: 'Walmart Inc.',             sector: 'Retail'       },
  { symbol: 'XOM',   name: 'ExxonMobil Corp.',         sector: 'Energy'       },
  { symbol: 'BAC',   name: 'Bank of America',          sector: 'Finance'      },
  { symbol: 'PFE',   name: 'Pfizer Inc.',              sector: 'Healthcare'   },
  { symbol: 'DIS',   name: 'Walt Disney Co.',          sector: 'Entertainment'},
  { symbol: 'NFLX',  name: 'Netflix Inc.',             sector: 'Entertainment'},
  { symbol: 'AMD',   name: 'Advanced Micro Devices',   sector: 'Technology'   },
  { symbol: 'UBER',  name: 'Uber Technologies',        sector: 'Transport'    },
  { symbol: 'COIN',  name: 'Coinbase Global',          sector: 'Finance'      },
  { symbol: 'SPOT',  name: 'Spotify Technology',       sector: 'Entertainment'},
  { symbol: 'PYPL',  name: 'PayPal Holdings',          sector: 'Finance'      },
  { symbol: 'XYZ',   name: 'Block Inc.',               sector: 'Finance'      },
  { symbol: 'SHOP',  name: 'Shopify Inc.',             sector: 'Technology'   },
  { symbol: 'SNAP',  name: 'Snap Inc.',                sector: 'Technology'   },
  { symbol: 'TWLO',  name: 'Twilio Inc.',              sector: 'Technology'   },
  { symbol: 'CRWD',  name: 'CrowdStrike Holdings',     sector: 'Technology'   },
  { symbol: 'DDOG',  name: 'Datadog Inc.',             sector: 'Technology'   },
  { symbol: 'NET',   name: 'Cloudflare Inc.',          sector: 'Technology'   },
  { symbol: 'ZS',    name: 'Zscaler Inc.',             sector: 'Technology'   },
  { symbol: 'PLTR',  name: 'Palantir Technologies',    sector: 'Technology'   },
  { symbol: 'RBLX',  name: 'Roblox Corp.',             sector: 'Entertainment'},
  { symbol: 'HOOD',  name: 'Robinhood Markets',        sector: 'Finance'      },
  { symbol: 'SOFI',  name: 'SoFi Technologies',        sector: 'Finance'      },
  { symbol: 'LCID',  name: 'Lucid Group',              sector: 'Automotive'   },
  { symbol: 'RIVN',  name: 'Rivian Automotive',        sector: 'Automotive'   },
  { symbol: 'NIO',   name: 'NIO Inc.',                 sector: 'Automotive'   },
  { symbol: 'BABA',  name: 'Alibaba Group',            sector: 'Consumer'     },
  { symbol: 'JD',    name: 'JD.com Inc.',              sector: 'Consumer'     },
  { symbol: 'PDD',   name: 'PDD Holdings',             sector: 'Consumer'     },
  { symbol: 'MELI',  name: 'MercadoLibre Inc.',        sector: 'Consumer'     },
  { symbol: 'SE',    name: 'Sea Limited',              sector: 'Technology'   },
  { symbol: 'GRAB',  name: 'Grab Holdings',            sector: 'Transport'    },
  { symbol: 'ABNB',  name: 'Airbnb Inc.',              sector: 'Travel'       },
  { symbol: 'DASH',  name: 'DoorDash Inc.',            sector: 'Consumer'     },
  { symbol: 'LYFT',  name: 'Lyft Inc.',                sector: 'Transport'    },
  { symbol: 'SNOW',  name: 'Snowflake Inc.',           sector: 'Technology'   },
  { symbol: 'MDB',   name: 'MongoDB Inc.',             sector: 'Technology'   },
  { symbol: 'DKNG',  name: 'DraftKings Inc.',          sector: 'Entertainment'},
  { symbol: 'PENN',  name: 'PENN Entertainment',       sector: 'Entertainment'},
  { symbol: 'CHWY',  name: 'Chewy Inc.',               sector: 'Retail'       },
];

const BASE = 'https://finnhub.io/api/v1';

function getApiKey(): string {
  const key = import.meta.env.VITE_FINNHUB_API_KEY as string;
  if (!key || key === 'your_finnhub_api_key_here') {
    throw new Error('Missing VITE_FINNHUB_API_KEY — copy .env.example to .env and fill in your Finnhub key (free at https://finnhub.io)');
  }
  return key;
}

const RESOLUTION_MAP: Record<'minute' | 'hour' | 'day', string> = {
  minute: '1',
  hour:   '60',
  day:    'D',
};

/** Fetches OHLCV candle bars for a symbol — used for price charts */
export async function fetchAggBars(
  symbol: string,
  from: string,
  to: string,
  timespan: 'minute' | 'hour' | 'day',
): Promise<PricePoint[]> {
  const key = getApiKey();
  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(new Date(to).getTime()   / 1000);
  const resolution = RESOLUTION_MAP[timespan];
  const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromTs}&to=${toTs}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub candle failed for ${symbol}: HTTP ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  if (json.s === 'no_data') return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.t as number[]).map((ts: number, i: number) => ({
    timestamp: ts * 1000,
    price: json.c[i],
  }));
}
