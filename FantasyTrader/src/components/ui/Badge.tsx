// Inline pill badge for status labels, sectors, and change percents

import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-500/15 text-emerald-400',
  red:   'bg-red-500/15 text-red-400',
  amber: 'bg-amber-500/15 text-amber-400',
  blue:  'bg-blue-500/15 text-blue-400',
  gray:  'bg-zinc-500/15 text-zinc-400',
};

/** Pill badge for displaying status, sector, and change percent values. */
export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
