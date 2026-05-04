// Small status/label pill used for game results, draft picks, and room status

import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-[rgba(200,168,130,0.1)]  text-[#c8a882]  border border-[rgba(200,168,130,0.2)]',
  red:   'bg-[rgba(255,69,96,0.1)]  text-[#ff4560]  border border-[rgba(255,69,96,0.2)]',
  amber: 'bg-[rgba(200,168,130,0.1)] text-[#c8a882]  border border-[rgba(200,168,130,0.2)]',
  blue:  'bg-[rgba(90,138,136,0.1)] text-[#5a8a88]  border border-[rgba(90,138,136,0.2)]',
  gray:  'bg-[rgba(255,255,255,0.05)] text-[#7a6e60] border border-white/[0.08]',
};

/** Inline pill badge with themed color variants. */
export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
