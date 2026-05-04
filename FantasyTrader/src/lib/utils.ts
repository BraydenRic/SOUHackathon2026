// Utility for merging Tailwind class names — combines clsx conditionals with
// tailwind-merge deduplication so conflicting classes resolve correctly.

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merges class names, resolving Tailwind conflicts via tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
