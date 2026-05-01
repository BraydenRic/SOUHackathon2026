// Cloud Run price service — streams Finnhub WebSocket trades into Firestore, with REST fallback on startup
import * as admin from "firebase-admin";
import WebSocket from "ws";
import * as http from "http";
import * as https from "https";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY!;
const PORT = process.env.PORT ?? "8080";

const SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "JNJ",
  "WMT", "XOM", "BAC", "PFE", "DIS", "NFLX", "AMD", "UBER", "COIN", "SPOT",
  "PYPL", "SQ", "SHOP", "SNAP", "TWLO", "CRWD", "DDOG", "NET", "ZS", "PLTR",
  "RBLX", "HOOD", "SOFI", "LCID", "RIVN", "NIO", "BABA", "JD", "PDD", "MELI",
  "SE", "GRAB", "ABNB", "DASH", "LYFT", "SNOW", "MDB", "DKNG", "PENN", "CHWY",
];

interface PriceEntry {
  price: number;
  updatedAt: admin.firestore.Timestamp;
}

// Uses Application Default Credentials on Cloud Run automatically
admin.initializeApp();
const db = admin.firestore();

// Accumulates the latest price per symbol between Firestore writes
const priceBuffer: Record<string, number> = {};

function connectFinnhub(): WebSocket {
  const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

  ws.on("open", () => {
    console.log("Finnhub WebSocket connected");
    for (const symbol of SYMBOLS) {
      ws.send(JSON.stringify({ type: "subscribe", symbol }));
    }
  });

  ws.on("message", (raw: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type !== "trade" || !Array.isArray(msg.data)) return;
      for (const trade of msg.data) {
        if (trade.s && typeof trade.p === "number") {
          priceBuffer[trade.s] = trade.p;
        }
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", () => {
    console.warn("Finnhub WebSocket closed — reconnecting in 3s");
    setTimeout(connectFinnhub, 3000);
  });

  ws.on("error", (err) => {
    console.error("Finnhub WebSocket error:", err.message);
    ws.close();
  });

  return ws;
}

async function flushToFirestore(): Promise<void> {
  if (Object.keys(priceBuffer).length === 0) return;

  const prices: Record<string, PriceEntry> = {};
  for (const [symbol, price] of Object.entries(priceBuffer)) {
    prices[symbol] = { price, updatedAt: admin.firestore.Timestamp.now() };
  }

  try {
    await db.doc("prices/latest").set(
      { prices, updatedAt: admin.firestore.Timestamp.now() },
      { merge: true }
    );
  } catch (err) {
    console.error("Firestore write failed:", err);
  }
}

function fetchQuote(symbol: string): Promise<number | null> {
  return new Promise((resolve) => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(typeof json.c === "number" && json.c > 0 ? json.c : null);
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

// Fetches all 50 symbols via REST on startup so Firestore has data immediately,
// even when the market is closed and no WebSocket trade events are coming in.
async function seedPricesFromRest(): Promise<void> {
  console.log("Seeding initial prices from Finnhub REST API...");
  for (const symbol of SYMBOLS) {
    const price = await fetchQuote(symbol);
    if (price !== null) priceBuffer[symbol] = price;
    // Stay well under the 60 calls/min free tier limit
    await new Promise((r) => setTimeout(r, 1200));
  }
  await flushToFirestore();
  console.log("Initial price seed complete");
}

// Minimal HTTP server required by Cloud Run for health checks
const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("ok");
});

server.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
  connectFinnhub();
  seedPricesFromRest();
  // Write batched prices to Firestore every 2 seconds
  setInterval(flushToFirestore, 2000);
});
