# Fantasy Trader

> Fantasy sports meets the stock market — draft real stocks, compete against a friend, and see who wins.

Built for **SOU Hackathon 2026**.

---

## What It Is

Fantasy Trader is a gamified stock trading web app with two modes:

- **Sandbox** — Solo practice mode. Start with $10,000 in fake cash, buy and sell from a pool of 50 real stocks, and watch your portfolio grow using live market prices. No risk, all the fun.
- **Draft** — Competitive 1v1 mode. Two players snake-draft stocks from the same pool and compete over a chosen time window (1 hour, 1 day, or 1 week). The player with the highest percentage portfolio gain wins ◈ coins, which can be spent on profile titles.

---

## Features

- Google Sign-In authentication
- Sandbox trading with live Finnhub price data and portfolio history
- 1v1 Draft rooms with snake-draft pick order
- Configurable match durations: 1 min (test), 1 hour, 1 day, 1 week
- Win tracking and coin rewards — winners earn ◈ coins
- Spend coins on profile titles to show off your rank
- Real-time price updates: Finnhub → Firestore → client
- **Match history** — review completed games with your gain % vs opponent's, result badge, and stocks you drafted
- **Leaderboard** — global rankings by wins, showing win rate and coin balance (top 50 players)

---

## Tech Stack

| Layer           | Stack                                                         |
| --------------- | ------------------------------------------------------------- |
| Frontend        | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7  |
| State           | Zustand v5                                                    |
| Charts          | Recharts                                                      |
| Auth & DB       | Firebase (Auth, Firestore)                                    |
| Price Data      | Finnhub REST API                                              |
| Backend Service | Node.js, TypeScript, Firebase Admin SDK                       |
| Hosting         | Firebase Hosting (frontend), Google Cloud Run (price service) |

---

## Project Structure

```
SOUHackathon2026/
├── FantasyTrader/       # React frontend
│   └── src/
│       ├── pages/       # Route-level components
│       ├── components/  # Reusable UI and feature components
│       ├── store/       # Zustand stores (auth, sandbox, game)
│       ├── hooks/       # useStockPrices, useRoom, usePortfolio
│       ├── lib/         # Firebase and Finnhub clients
│       └── types/       # Shared TypeScript interfaces
└── price-service/       # Node.js Finnhub polling service
    └── src/
        └── index.ts     # Polls Finnhub every 60s, writes to Firestore
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase project](https://console.firebase.google.com/) with Firestore and Google Auth enabled
- A free [Finnhub API key](https://finnhub.io)

### Frontend

```bash
cd FantasyTrader
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your keys:

| Variable                            | Description                  |
| ----------------------------------- | ---------------------------- |
| `VITE_FINNHUB_API_KEY`              | Finnhub API key              |
| `VITE_FIREBASE_API_KEY`             | Firebase web API key         |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain         |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID          |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket      |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID`              | Firebase app ID              |

### Price Service

```bash
cd price-service
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in:

| Variable              | Description         |
| --------------------- | ------------------- |
| `FINNHUB_API_KEY`     | Finnhub API key     |
| `FIREBASE_PROJECT_ID` | Firebase project ID |

The service polls Finnhub every 60 seconds and writes prices to Firestore. The frontend reads prices from Firestore in real time.

---

## Design

- Dark premium theme — warm charcoal (`#0a0908`) background with a cream/gold (`#c8a882`) primary accent and dusty teal (`#5a8a88`) secondary
- Typography: [Syne Variable](https://fonts.google.com/specimen/Syne) for headings, [Geist Variable](https://vercel.com/font) for body, Geist Mono for numbers and labels
- Animated aurora background on the landing page — soft color blobs drifting in multiple directions
- Responsive across all screen sizes; mobile nav uses a full-screen hamburger drawer
- Custom SVG favicon matching the navbar logo
- Deployed on Firebase Hosting for native Google Sign-In support

---

## How to Play

1. **Sign in** with your Google account
2. **Try Sandbox** — buy and sell stocks to get a feel for the interface
3. **Create a room** from the Lobby and share the room code with a friend
4. **Draft** — take turns picking stocks snake-draft style
5. **Wait** for the match duration to end
6. **Check results** — highest percentage gain wins; the winner earns ◈ coins
7. **Spend coins** on profile titles from the Profile page

---

## Team

Built at SOU Hackathon 2026 by:

- **Brayden Stach**
- **Katherine Nunn**
- **Alec Clark**
