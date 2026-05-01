// Cloud Run price service — polls Finnhub REST API and writes prices to Firestore
import * as admin from "firebase-admin";
import * as http from "http";
import * as https from "https";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY!;
const PORT = process.env.PORT ?? "8080";
const POLL_INTERVAL_MS = 60_000;
// 1.2s between calls keeps 50 requests well under the 60/min free tier limit
const CALL_DELAY_MS = 1_200;

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

admin.initializeApp();
const db = admin.firestore();

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

async function pollAndFlush(): Promise<void> {
  console.log("Polling Finnhub REST for all symbols...");
  const prices: Record<string, PriceEntry> = {};

  for (const symbol of SYMBOLS) {
    const price = await fetchQuote(symbol);
    if (price !== null) {
      prices[symbol] = { price, updatedAt: admin.firestore.Timestamp.now() };
    }
    await new Promise((r) => setTimeout(r, CALL_DELAY_MS));
  }

  if (Object.keys(prices).length === 0) return;

  try {
    await db.doc("prices/latest").set(
      { prices, updatedAt: admin.firestore.Timestamp.now() },
      { merge: true }
    );
    console.log(`Wrote ${Object.keys(prices).length} prices to Firestore`);
  } catch (err) {
    console.error("Firestore write failed:", err);
  }
}

const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end("ok");
});

server.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
  // Poll immediately on startup then every 60 seconds
  pollAndFlush();
  setInterval(pollAndFlush, POLL_INTERVAL_MS);
});
