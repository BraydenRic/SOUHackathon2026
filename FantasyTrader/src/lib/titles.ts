// Purchasable profile titles — shown next to display names across the app

export interface TitleDef {
  id: string;
  label: string;
  cost: number;
  color: string;   // Tailwind text color class applied to the icon + badge text
  bg: string;      // Tailwind bg + border classes for the badge pill
}

/** All purchasable titles in ascending coin cost order */
export const TITLES: TitleDef[] = [
  {
    id: 'day_trader',
    label: 'Day Trader',
    cost: 30,
    color: 'text-[#c8a882]',
    bg: 'bg-[rgba(200,168,130,0.1)] border-[rgba(200,168,130,0.25)]',
  },
  {
    id: 'diamond_hands',
    label: 'Diamond Hands',
    cost: 50,
    color: 'text-[#c4846a]',
    bg: 'bg-[rgba(196,132,106,0.1)] border-[rgba(196,132,106,0.25)]',
  },
  {
    id: 'bull_run',
    label: 'Bull Run',
    cost: 75,
    color: 'text-[#22c55e]',
    bg: 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.25)]',
  },
  {
    id: 'bear_slayer',
    label: 'Bear Slayer',
    cost: 75,
    color: 'text-[#e07a5f]',
    bg: 'bg-[rgba(224,122,95,0.1)] border-[rgba(224,122,95,0.25)]',
  },
  {
    id: 'whale',
    label: 'Whale',
    cost: 100,
    color: 'text-[#c8a882]',
    bg: 'bg-[rgba(200,168,130,0.1)] border-[rgba(200,168,130,0.25)]',
  },
  {
    id: 'market_wizard',
    label: 'Market Wizard',
    cost: 150,
    color: 'text-[#d4907a]',
    bg: 'bg-[rgba(212,144,122,0.1)] border-[rgba(212,144,122,0.25)]',
  },
];

/** Lookup map for O(1) access by title ID — derived from TITLES array */
export const TITLE_MAP: Record<string, TitleDef> = Object.fromEntries(
  TITLES.map(t => [t.id, t]),
);
