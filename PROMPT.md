# Fantasy Trader — Build Prompt

## What You're Building

Fantasy Trader is a web app that gamifies stock market trading. It has two modes:

**Sandbox Mode** is a solo learning environment. The user starts with $10,000 in fake cash and can buy and sell from a curated list of 50 real stocks using live price data from Finnhub. Their portfolio persists across sessions. The goal is to learn how trading works in a low-stakes, consequence-free environment.

**Draft Mode** is a 1v1 competitive multiplayer mode. Two players join a room using a code, snake-draft stocks from the same curated pool, then watch their picks compete over a chosen time period (1 hour, 1 day, or 1 week). Whoever's portfolio has the highest percentage gain at the end wins the round and earns coins. Coins can be spent on power-ups during the game.

---

## Tech Stack

Use Vite with React and TypeScript for the frontend. Style everything with Tailwind CSS. Use Recharts for all price charts. Use React Router v6 for client-side routing. Use Firebase for authentication (Google sign-in), the Firestore database, and hosting. Use Zustand for global client state. Use Finnhub for real stock price data via WebSocket. Deploy to Firebase Hosting or Vercel.

---

## Environment Variables

All sensitive keys live in a `.env.local` file inside the `FantasyTrader` directory. This file must be added to `.gitignore` and never committed. A `.env.example` file is committed as a template. The required variables are the six Firebase config values (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID) and the Finnhub API key. Frontend variables must be prefixed with `VITE_` so Vite exposes them to the client. The Finnhub API key is also used by the Cloud Run price service and should be set as an environment variable there. Never hardcode any key anywhere in source files.

---

## Project Structure

Organize the source directory into these folders: `pages` for top-level route components, `components` with subfolders for `layout`, `sandbox`, `draft`, `game`, and `ui`, `lib` for third-party client setup, `store` for Zustand stores, `hooks` for reusable data-fetching logic, `types` for all shared TypeScript interfaces, and `utils` for pure helper functions.

---

## Data Model

Define all TypeScript types in a single `types/index.ts` file so they are shared everywhere.

A **User** has a uid, email, display name, optional photo URL, a coin balance starting at 100, a games played count, a games won count, and a created-at timestamp.

A **Stock** has a symbol, company name, sector, current price, previous close price, change percent, and an array of price history points. Each price point has a timestamp and a price.

A **SandboxPosition** represents one holding in the sandbox. It has a symbol, number of shares, average cost basis, and current price.

A **Transaction** represents a single buy or sell in the sandbox. It has a unique ID, symbol, type (buy or sell), number of shares, price per share, total value, and timestamp.

A **Room** is the core multiplayer document. It has a host user ID, a guest user ID (null until someone joins), a status field that progresses through waiting, drafting, active, and completed, a duration field (1h, 1d, or 1w), start and end timestamps, a draft order array, a current draft turn index, an array of draft picks, a winner ID, and a coin reward amount.

A **DraftPick** has a user ID, stock symbol, pick number, and the price of that stock at the moment it was drafted.

A **GamePortfolio** is a derived view per player per room showing their picks, current total value, starting total value, and gain percent.

A **PowerUp** is one of three string literals: insider_tip, freeze, or power_pick.

A **CoinTransaction** records every coin award or spend with a user ID, amount, reason string, and timestamp.

---

## Firebase Setup

Initialize the Firebase app once in `lib/firebase.ts` using the environment variables. Export the auth instance, the Firestore db instance, and a Google auth provider instance. Nothing else should live in this file.

---

## Firestore Security Rules

These rules are exact and must be deployed before any users access the app.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /sandbox/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.hostId == request.auth.uid;
      allow update: if request.auth != null
        && (resource.data.hostId == request.auth.uid
          || resource.data.guestId == request.auth.uid
          || resource.data.guestId == null);
    }

    match /gamePortfolios/{portfolioId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    match /coinTransactions/{txId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    match /prices/{doc} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## Stock Pool

The curated pool of 50 stocks available in both sandbox and draft mode is: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, JPM, V, JNJ, WMT, XOM, BAC, PFE, DIS, NFLX, AMD, UBER, COIN, SPOT, PYPL, SQ, SHOP, SNAP, TWLO, CRWD, DDOG, NET, ZS, PLTR, RBLX, HOOD, SOFI, LCID, RIVN, NIO, BABA, JD, PDD, MELI, SE, GRAB, ABNB, DASH, LYFT, SNOW, MDB, DKNG, PENN, CHWY. Each entry has a symbol, human-readable company name, and sector label. Define this as a constant in `lib/finnhub.ts`.

---

## Price Architecture

Stock prices are not fetched directly by the frontend. Instead a dedicated Cloud Run service handles all Finnhub communication and writes price data to Firestore. The frontend reads prices exclusively from Firestore via real-time listeners.

### Cloud Run Price Service

The price service lives in a separate `price-service/` directory at the repo root. It is a Node.js TypeScript service that does the following on startup: opens a single Finnhub WebSocket connection, subscribes to all 50 stocks in the pool, batches incoming trade events, and writes the entire prices map as a single Firestore document at `prices/latest` every 2 seconds. It also writes each stock's price history as a subcollection for chart data. The service must reconnect automatically if the WebSocket drops. Deploy it to Google Cloud Run with a minimum of 1 instance so it is always running. Set the Finnhub API key as a Cloud Run environment variable.

### Finnhub Client (`lib/finnhub.ts`)

The frontend Finnhub client is read-only and does not open WebSocket connections. It exposes a function to fetch REST price snapshots for a symbol (used as a fallback when Firestore data is stale) and a function to fetch aggregate price history for chart rendering. Define the 50-stock pool constant here. All functions must throw descriptive errors on failure.

### Frontend Price Reading

The frontend reads from Firestore document `prices/latest` via a real-time listener. The `useStockPrices` hook subscribes to this document and returns a prices map keyed by symbol. If the document has not been updated in more than 10 seconds, show a stale data indicator. No polling or WebSocket logic lives in the frontend.

---

## Auth Store

The auth Zustand store holds the current typed User object, the raw Firebase user, a loading boolean, and an error string. It exposes an initialize action that sets up the Firebase auth state listener, creates a new Firestore user document with a starting coin balance of 100 on first sign-in, and returns the unsubscribe function. It exposes a signInWithGoogle action that triggers the Google popup, a signOutUser action that signs out and clears state, and a refreshUser action that re-fetches the user document from Firestore. The initialize action must be called once in the root App component inside a useEffect and its return value used as the cleanup function.

---

## Sandbox Store

The sandbox Zustand store holds the user's cash balance starting at $10,000, a positions map keyed by symbol, a transactions array, and a loading boolean. It exposes actions to load sandbox state from Firestore, persist the current state back to Firestore, buy a stock (must validate the user has enough cash and correctly compute a weighted average cost basis when the user already holds shares of that stock), sell a stock (must validate the user owns enough shares), update current prices across all positions without triggering a save, and reset everything back to $10,000. Every buy and sell must persist to Firestore immediately after updating local state.

---

## Game Store

The game Zustand store holds the current room object, a live prices map keyed by symbol, a loading boolean, and an error string. It exposes actions to create a room and return the new room ID, join a room by ID, subscribe to a room with a Firestore real-time listener returning the unsubscribe function, make a draft pick by appending to the picks array and incrementing the turn counter, start the game by setting status to active and computing the end timestamp from the duration, update a live price in local state only without a Firestore write, complete the game by recording the winner, and award coins to a user by incrementing their balance and appending a coin transaction record.

---

## Utility Functions

The formatters file exposes a USD currency formatter, a signed percentage formatter that prefixes positive values with a plus sign, a compact dollar formatter that abbreviates thousands with a K suffix, and a countdown formatter that turns a future Date into a human-readable hours-minutes-seconds string.

The calculations file exposes a function to sum portfolio value from a positions map, a function to compute net worth as cash plus portfolio value, a function to compute gain percent between two values, a function to compute a draft portfolio's overall gain percent given picks and a current prices map, and a function to determine the game winner given both players' picks and current prices returning host, guest, or tie.

---

## Hooks

The `useStockPrices` hook subscribes to the Firestore document `prices/latest` via a real-time listener and returns a prices map keyed by symbol, a loading boolean, and an `isStale` boolean that is true if the document has not been updated in more than 10 seconds. It unsubscribes on unmount.

The `useRoom` hook accepts a room ID, subscribes to that room document via the game store, and returns the current room and a loading boolean. It unsubscribes on unmount.

The `usePortfolio` hook accepts an array of draft picks and a live prices map and returns each player's current value, start value, and gain percent as memoized derived values. It makes no network calls.

---

## Pages

### Landing
A visually striking hero with the app name and tagline "Trade smart. Draft smarter." Two CTAs: enter sandbox and start a draft. Three brief feature callouts below the hero explaining each mode and the coins system. Redirect authenticated users directly to the sandbox.

### Login
A centered page with a single Google Sign-In button. On success redirect to sandbox. On failure show the error message inline. Disable the button and show a loading label inside it while the sign-in popup is in progress.

### Sandbox
On mount, load the user's sandbox state from Firestore and start polling prices with the useStockPrices hook. On each price update, sync current prices into the positions in the store. Two-column layout: left shows a searchable and sector-filterable list of all 20 stocks with symbol, name, price, and a colored change percent badge; right shows the selected stock's price chart with 1D, 1W, and 1M timeframe buttons, a trade panel with buy and sell buttons and a share quantity input, and a portfolio summary showing cash, portfolio value, net worth, and return percent. Transaction history appears below both columns. A reset button in the top right triggers a confirmation modal then resets to $10,000.

### Lobby
Two options: create a room or join a room. Create lets the user pick a duration, writes the room to Firestore, and displays the room code in large text with a copy button. Join takes a code input and redirects to the draft page on success. While waiting for an opponent after creating, keep the code visible and show a waiting indicator.

### Draft
Subscribe to the room on mount. Show a waiting screen until both players are present. Once both are present, render the snake draft interface with all 50 stocks in a grid. Picked stocks are dimmed and non-interactive. Clearly indicate whose turn it is. Show a 30-second countdown progress bar per pick. If the timer expires auto-select the stock with the highest current change percent from the remaining pool. Show each player's growing pick list side by side. After all 4 picks are made show a Start Game button visible only to the host. Clicking it sets the room to active and both players are redirected to the game page.

### Game
Subscribe to the room on mount and redirect if the status is not active. Read live prices from Firestore via the useStockPrices hook and update the game store on every tick. Show a live leaderboard with both players' gain percent in large type updating in real time with a clear winner indicator. Show each player's individual pick performance below. Show a countdown timer. A coin shop panel lets players spend coins on three power-ups: Insider Tip for 20 coins reveals which unpicked stock has the highest current gain, Freeze for 30 coins flags one opponent stock as frozen for 5 minutes with no mechanical effect beyond the visual flag, and Power Pick for 50 coins lets the user add one more stock from the remaining pool. Record power-up usage on the room document in Firestore. When the countdown hits zero compute the winner, call completeGame, award coins, and show a winner modal.

### Profile
Show the user's avatar, display name, and coin balance prominently. Show games played, games won, and win rate. Show a list of recent coin transactions with amount, reason, and timestamp.

---

## UI Components

**Button** has primary, secondary, danger, and ghost variants and sm, md, lg sizes. Always accepts a loading prop that disables it and shows an inline spinner. Never use a plain HTML button element elsewhere in the app.

**Modal** renders through a React portal. Has a dark backdrop that closes the modal on click. Closes on Escape key. Traps focus inside while open. Accepts a title, children, and an onClose callback.

**Badge** is an inline pill with green, red, amber, and blue variants used for change percents, sector labels, and status labels.

**LoadingSpinner** centers in the viewport when the fullScreen prop is true and renders inline otherwise.

**PriceChart** wraps a Recharts AreaChart. Colors the area and stroke green when the latest price is at or above the first price in the series and red when below. Shows a crosshair tooltip with price and formatted timestamp on hover.

**StockTicker** is a horizontally auto-scrolling bar showing all active game stocks with symbol, price, and a colored directional arrow with change percent. Used at the top of the Game page.

**Navbar** shows the app logo on the left. When authenticated shows links to Sandbox and Lobby, the user's coin balance, their avatar, and a sign-out button. When unauthenticated shows a sign-in link. Fixed to the top of the viewport with backdrop blur.

**ProtectedRoute** wraps authenticated routes. Redirects to login if the user is not authenticated once loading is complete. Renders nothing while loading.

---

## Error Handling

Every async operation must be wrapped in try/catch. All errors must surface as toast notifications in the bottom-right corner — never console-only and never as raw error objects. Map common Firebase error codes to plain English messages. If the Firestore prices document has not updated in more than 10 seconds, show a small stale data indicator. The Cloud Run service handles WebSocket reconnection automatically. When a stock price cannot be fetched show the last known price with a dimmed stale label rather than an empty state.

---

## Performance

Wrap stock list row components in React.memo since prices update frequently. Use useMemo for all derived values including portfolio totals, gain percentages, and leaderboard sort order. Debounce the share quantity input by 200ms. Always return cleanup functions from useEffect hooks that set up subscriptions, intervals, or sockets.

---

## Code Documentation

Every exported function, hook, component, and Zustand action must have a JSDoc comment describing what it does, its parameters, and its return value. Keep comments concise — one sentence per parameter is enough. Do not comment on things that are self-evident from the code or type signatures.

Inside function bodies, only add inline comments when the logic is non-obvious: a subtle invariant, a workaround for a known API quirk, or a business rule that isn't derivable from the code itself. Do not narrate what the code does line by line.

Every file should have a one-line header comment stating its responsibility (e.g. `// Finnhub client — REST price snapshots and chart history`).

---

## Security Notes

Firestore rules are the only real server-side enforcement — deploy them before any users access the app. Always use the Firebase Auth UID as the Firestore document ID for user-scoped data. Validate all user inputs client-side before writing to Firestore. Add a comment in the coin award logic noting that in production coin balances should be computed server-side via Cloud Functions to prevent client manipulation.

---

## Build Order

Build in this sequence to avoid blocked dependencies. First: project scaffold, Firebase init, Google auth, and protected routing. Second: Cloud Run price service, Finnhub WebSocket, Firestore price writes, and useStockPrices hook. Third: full sandbox mode. Fourth: lobby, draft, and game pages with real-time Firestore prices. Fifth: coins, power-ups, profile page, and UI polish.

---

## Demo Script

Sign in with Google and land on sandbox. Show live prices loading and buy shares of two stocks. Navigate to lobby, create a room, copy the code. Open a second tab with a different Google account and join. Walk through the snake draft. Start the game and show the live leaderboard updating. Spend coins on a power-up. Let the timer run out and show the winner modal with coins awarded.

---

## Stretch Goals

Spectator mode with a shareable read-only link, a global all-time leaderboard sorted by coins, real stock headlines pulled from Finnhub's news endpoint shown during the game, and a coin shop for spending coins on profile badges.