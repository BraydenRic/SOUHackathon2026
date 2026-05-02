// Hero landing page with CTAs and feature callouts

import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import graphBg from '../assets/graph.betterer.jpg';

interface FeatureCardProps {
  icon?: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-zinc-100 font-semibold text-lg mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/** Landing page with hero section and feature callouts. */
export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${graphBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60 -z-10 fixed" />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-400 text-sm font-medium mb-8">
          <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
          Live market data
        </div>

       <h1 className="text-6xl font-bold tracking-tight text-zinc-100 mb-4">
  <span className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
    Fantasy<span className="text-emerald-400">Trader</span>
  </span>
</h1>

<p className="text-xl text-white mb-10 max-w-md">
  <span className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
    Trade smart. Draft smarter.
  </span>
</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/sandbox">
            <Button variant="primary" size="lg">Enter Sandbox</Button>
          </Link>
          <Link to="/lobby">
            <Button variant="secondary" size="lg">Start a Draft</Button>
          </Link>
        </div>
      </main>

      {/* Feature callouts */}
      <section className="pt-3 px-6 pb-6 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon=""
            title="Sandbox Mode"
            description="Start with $10,000 in fake cash. Buy and sell from 20 real stocks using live price data. Learn how trading works with zero risk."
          />
          <FeatureCard
            icon=""
            title="Draft Mode"
            description="Challenge a friend to a 1v1 snake draft. Pick stocks, set a time window, and see whose portfolio gains more. Winner takes the coins."
          />
          <FeatureCard
            icon=""
            title="Coins & Power-Ups"
            description="Earn coins by winning drafts. Spend them on power-ups like Insider Tip, Freeze, and Power Pick to swing the game in your favor."
          />
        </div>
      </section>
    </div>
  );
}