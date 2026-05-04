/**
 * LandingPage.tsx
 *
 * This is the first page anyone sees when they visit the app — the hero landing page.
 * It's meant to give a quick overview of what FantasyTrader is and get people to
 * either jump into the sandbox to practice, or go straight to the lobby to start
 * a draft game against someone.
 *
 * The page has two main sections:
 * 1. The hero — big title, tagline, and two CTA buttons
 * 2. Feature callouts — three cards explaining the main features of the app
 *
 * The whole page is wrapped in the AuroraBackground component which gives it
 * that animated aurora borealis effect in the background. The title and tagline
 * have a dark semi-transparent backdrop so they're readable over the animation.
 */

import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { AuroraBackground } from '../components/ui/aurora-background';

/**
 * Props for the FeatureCard component.
 *
 * @param icon - Optional emoji or icon to show above the title
 * @param title - The name of the feature being described
 * @param description - A short explanation of what the feature does
 */
interface FeatureCardProps {
  icon?: string;
  title: string;
  description: string;
}

/**
 * FeatureCard component
 *
 * A simple dark card used in the feature callouts section at the bottom
 * of the landing page. Each card highlights one of the app's main features.
 *
 * The icon is optional — if it's not passed, we just skip rendering that div
 * instead of showing an empty space.
 *
 * @param icon - Optional emoji shown above the title
 * @param title - Feature name shown as a heading
 * @param description - Short description of the feature
 */
function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl pt-3 px-6 pb-6 text-left">
      {/* Only render the icon div if an icon was actually passed */}
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <h3 className="text-zinc-100 font-semibold text-lg mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/**
 * LandingPage component
 *
 * The main landing page of the app. Renders a full-screen hero section
 * with the app name, tagline, and navigation buttons, followed by a row
 * of three feature cards explaining what the app does.
 *
 * Layout breakdown:
 * - AuroraBackground wraps everything and provides the animated background
 * - Hero section takes up most of the screen with centered content
 * - Feature section sits at the bottom with a 3-column grid on larger screens
 *
 * The "Enter Sandbox" button takes users to the solo paper trading mode.
 * The "Start a Draft" button takes them to the lobby where they can create
 * or join a 1v1 draft game.
 */
export default function LandingPage() {
  return (
    /*
      AuroraBackground is a custom component that wraps the page in an
      animated aurora borealis effect. It handles its own sizing and
      background so we just need to put our content inside it.
    */
    <AuroraBackground>
      <div className="min-h-screen flex flex-col w-full">

        {/*
          Hero section — the main above-the-fold content.
          Centered both horizontally and vertically with flex.
          Takes up all available space between the top and the feature cards.
        */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">

          {/*
            "Live market data" pill badge — lets users know right away
            that the app uses real stock prices, not fake ones.
            The green pulsing dot adds a nice "live" indicator feel.
          */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-400 text-sm font-medium mb-8">
            <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
            Live market data
          </div>

          {/*
            App title — "Fantasy" in white and "Trader" in emerald green.
            The dark backdrop behind the text makes it readable over the
            aurora background animation.
          */}
          <h1 className="text-6xl font-bold tracking-tight text-zinc-100 mb-4">
            <span className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
              Fantasy<span className="text-emerald-400">Trader</span>
            </span>
const GHOST_CHART_PATH = "M0,260 C40,240 60,200 100,180 C140,160 160,210 200,200 C240,190 260,130 300,110 C340,90 360,140 400,130 C440,120 460,80 500,60 C540,40 560,90 600,80 C640,70 660,40 700,20 C740,0 760,40 800,30";

const features = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 14 L6 9 L9.5 11.5 L14 6 L18 3" />
        <polyline points="14 3 18 3 18 7" />
      </svg>
    ),
    label: 'Sandbox',
    title: 'Risk-free trading',
    desc: 'Start with $10,000 in virtual cash. Buy and sell from 50 real companies using live market prices. Zero risk, real data.',
    color: '#c8a882',
    glow: 'rgba(200,168,130,0.07)',
    border: 'rgba(200,168,130,0.13)',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v4l2.5 2.5" />
      </svg>
    ),
    label: 'Draft Mode',
    title: '1v1 competition',
    desc: 'Challenge a friend to a snake draft. Pick stocks from a shared pool, set a time window, and see whose portfolio wins.',
    color: '#5a8a88',
    glow: 'rgba(90,138,136,0.07)',
    border: 'rgba(90,138,136,0.13)',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="10,2 12.5,7.5 19,8.2 14.5,12.5 15.8,19 10,16 4.2,19 5.5,12.5 1,8.2 7.5,7.5" />
      </svg>
    ),
    label: 'Rewards',
    title: 'Earn & collect',
    desc: 'Win drafts to earn coins. Spend them on exclusive titles shown next to your name across the leaderboard.',
    color: '#c8a882',
    glow: 'rgba(200,168,130,0.05)',
    border: 'rgba(200,168,130,0.10)',
  },
];

export default function LandingPage() {
  return (
    <AuroraBackground className="min-h-screen overflow-hidden block">
      {/* Background overlays */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(200,168,130,0.045) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 75% 15%, rgba(196,132,106,0.03) 0%, transparent 55%)',
          }}
        />
        <svg className="absolute bottom-0 left-0 w-full opacity-[0.035]" viewBox="0 0 800 300" fill="none" preserveAspectRatio="none">
          <path d={GHOST_CHART_PATH} stroke="#c8a882" strokeWidth="2" />
          <path d={`${GHOST_CHART_PATH} L800,300 L0,300 Z`} fill="url(#chart-grad)" />
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a882" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#c8a882" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Hero — everything is its own centered block, no single long word spanning full width */}
      <main className="relative flex flex-col items-center text-center px-6 pt-28 pb-20">

        {/* Live badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 bg-[rgba(200,168,130,0.08)] border border-[rgba(200,168,130,0.18)] rounded-full px-4 py-1.5 mb-12">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c8a882]"
            style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
          />
          <span className="text-[#c8a882] text-xs font-medium tracking-wider">Live market data</span>
        </div>

        {/* Headline — two balanced lines, clearly centered */}
        <div className="animate-fade-up animate-stagger-1 mb-6">
          <h1 className="font-heading font-extrabold leading-[1] tracking-[-0.03em] text-[#ede8df]"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}
          >
            Fantasy
          </h1>
          <h1 className="font-heading font-extrabold leading-[1] tracking-[-0.03em] text-[#c8a882]"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}
          >
            Trader
          </h1>
        </div>

          {/*
            Tagline — short and punchy. Same dark backdrop treatment as the title
            so it doesn't get lost against the animated background.
          */}
          <p className="text-xl text-white mb-10 max-w-md">
            <span className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
              Trade smart. Draft smarter.
            </span>
          </p>

          {/*
            CTA buttons — stacked on mobile, side by side on larger screens.
            "Enter Sandbox" is the primary action for solo users who want to practice.
            "Start a Draft" is for users ready to compete against someone else.
          */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/sandbox">
              <Button variant="primary" size="lg">Enter Sandbox</Button>
            </Link>
            <Link to="/lobby">
              <Button variant="secondary" size="lg">Start a Draft</Button>
            </Link>
          </div>
        </main>

        {/*
          Feature callouts section — three cards at the bottom of the page
          explaining the three main things you can do in the app.
          Single column on mobile, 3 columns on medium+ screens.
        */}
        <section className="pt-3 px-6 pb-6 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Sandbox Mode — solo paper trading with fake money */}
            <FeatureCard
              title="Sandbox Mode"
              description="Start with $10,000 in fake cash. Buy and sell from 20 real stocks using live price data. Learn how trading works with zero risk."
            />

            {/* Draft Mode — 1v1 competitive stock picking */}
            <FeatureCard
              title="Draft Mode"
              description="Challenge a friend to a 1v1 snake draft. Pick stocks, set a time window, and see whose portfolio gains more. Winner takes the coins."
            />

            {/* Coins & Power-Ups — the meta-game reward system */}
            <FeatureCard
              title="Coins & Power-Ups"
              description="Earn coins by winning drafts. Spend them on power-ups like Insider Tip, Freeze, and Power Pick to swing the game in your favor."
            />
          </div>
        </section>
        <p className="animate-fade-up animate-stagger-2 text-[#7a6e60] text-base max-w-xs leading-relaxed mb-10">
          Draft real stocks. Beat your friends.
          <br />The market is the arena.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up animate-stagger-3 flex flex-col sm:flex-row gap-3 items-center mb-14">
          <Link to="/sandbox">
            <Button variant="primary" size="lg">Enter Sandbox</Button>
          </Link>
          <Link to="/lobby">
            <Button variant="outline" size="lg" className="hover:border-[#5a8a88] hover:text-[#5a8a88]">Start a Draft</Button>
          </Link>
        </div>

        {/* Stat pills */}
        <div className="animate-fade-up animate-stagger-4 flex items-center gap-1">
          {[
            { value: '50', label: 'stocks' },
            { value: '4', label: 'picks each' },
            { value: '4', label: 'time windows' },
          ].map(({ value, label }, i) => (
            <>
              <div key={label} className="flex items-baseline gap-1.5 px-4 py-2">
                <span className="font-heading font-bold text-xl text-[#ede8df]">{value}</span>
                <span className="text-[#7a6e60] text-xs">{label}</span>
              </div>
              {i < 2 && <span key={`sep-${i}`} className="text-white/10 text-sm">·</span>}
            </>
          ))}
        </div>
      </main>

      {/* Feature cards */}
      <section className="relative max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`animate-fade-up animate-stagger-${i + 1} group relative rounded-2xl p-6 border overflow-hidden transition-all duration-300 hover:-translate-y-1`}
              style={{ backgroundColor: f.glow, borderColor: f.border }}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: f.color }}>
                    {f.label}
                  </span>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${f.glow}`, color: f.color }}>
                    {f.icon}
                  </div>
                </div>
                <h3 className="font-heading font-bold text-lg text-[#ede8df] mb-2 tracking-tight">{f.title}</h3>
                <p className="text-[#7a6e60] text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AuroraBackground>
  );
}
