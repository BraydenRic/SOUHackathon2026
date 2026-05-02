// Purchasable profile titles — shown next to display names across the app

export interface TitleDef {
  id: string;
  label: string;
  cost: number;
  color: string;   // Tailwind text color class applied to the icon + badge text
  bg: string;      // Tailwind bg + border classes for the badge pill
}

export const TITLES: TitleDef[] = [
  {
    id: 'day_trader',
    label: 'Day Trader',
    cost: 30,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/25',
  },
  {
    id: 'diamond_hands',
    label: 'Diamond Hands',
    cost: 50,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/25',
  },
  {
    id: 'bull_run',
    label: 'Bull Run',
    cost: 75,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/25',
  },
  {
    id: 'bear_slayer',
    label: 'Bear Slayer',
    cost: 75,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/25',
  },
  {
    id: 'whale',
    label: 'Whale',
    cost: 100,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/25',
  },
  {
    id: 'market_wizard',
    label: 'Market Wizard',
    cost: 150,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/25',
  },
];

export const TITLE_MAP: Record<string, TitleDef> = Object.fromEntries(
  TITLES.map(t => [t.id, t]),
);
