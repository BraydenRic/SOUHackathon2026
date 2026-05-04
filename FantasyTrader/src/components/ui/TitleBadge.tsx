// Shared title badge — icon + label, used in Navbar, Leaderboard, and ProfilePage

import type { ReactElement } from 'react';
import { TITLE_MAP } from '../../lib/titles';

const ICONS: Record<string, ReactElement> = {
  day_trader: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M13 2L3.5 13.5H10.5L9 22L20.5 10.5H13.5L13 2Z" />
    </svg>
  ),
  diamond_hands: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" className="w-full h-full">
      <polygon points="12,2 22,10 12,22 2,10" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  bull_run: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  bear_slayer: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 1L3 5V11C3 16.5 7 21.7 12 23C17 21.7 21 16.5 21 11V5L12 1Z" />
    </svg>
  ),
  whale: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <rect x="3"  y="13" width="4" height="8" rx="1" />
      <rect x="9"  y="8"  width="4" height="13" rx="1" />
      <rect x="15" y="3"  width="4" height="18" rx="1" />
    </svg>
  ),
  market_wizard: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 2C12 2 13 7.5 17 8.5C13 9.5 12 15 12 15C12 15 11 9.5 7 8.5C11 7.5 12 2 12 2Z" />
      <path d="M19 14C19 14 19.5 17 21 17.5C19.5 18 19 21 19 21C19 21 18.5 18 17 17.5C18.5 17 19 14 19 14Z" />
      <path d="M5 14C5 14 5.5 17 7 17.5C5.5 18 5 21 5 21C5 21 4.5 18 3 17.5C4.5 17 5 14 5 14Z" />
    </svg>
  ),
};

interface Props {
  titleId: string;
  /** 'sm' = inline use (navbar, leaderboard), 'md' = profile header */
  size?: 'sm' | 'md';
}

/** Renders a title badge with icon and label. */
export function TitleBadge({ titleId, size = 'sm' }: Props) {
  const def = TITLE_MAP[titleId];
  if (!def) return null;

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 rounded pl-1.5 pr-1 py-0.5 border w-fit ${def.color} ${def.bg}`}>
        <span className="w-2.5 h-2.5 shrink-0">{ICONS[titleId]}</span>
        <span className="text-[10px] font-medium tracking-wide whitespace-nowrap">{def.label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-xs font-medium ${def.color} ${def.bg}`}>
      <span className="w-3.5 h-3.5 shrink-0">{ICONS[titleId]}</span>
      {def.label}
    </span>
  );
}
