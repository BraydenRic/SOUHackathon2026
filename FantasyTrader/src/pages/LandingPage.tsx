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
import { AuroraBackground } from "@/components/ui/aurora-background";

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
          </h1>

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

      </div>
    </AuroraBackground>
  );
}