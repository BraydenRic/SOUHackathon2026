// Shared button component with variant and size support

import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:  'bg-[#c8a882] hover:bg-[#d4b896] text-[#0a0908] font-semibold shadow-[0_2px_16px_rgba(200,168,130,0.2)] hover:shadow-[0_4px_24px_rgba(200,168,130,0.3)]',
  secondary:'bg-[#1e1a16] hover:bg-[#252018] text-[#ede8df] border border-[rgba(255,245,235,0.09)] hover:border-[rgba(255,245,235,0.16)]',
  danger:   'bg-[rgba(255,69,96,0.12)] hover:bg-[rgba(255,69,96,0.2)] text-[#ff4560] border border-[rgba(255,69,96,0.25)] hover:border-[rgba(255,69,96,0.4)]',
  ghost:    'bg-transparent hover:bg-white/[0.04] text-[#7a6e60] hover:text-[#ede8df]',
  outline:  'bg-transparent border border-[rgba(255,245,235,0.13)] hover:border-[#c8a882] text-[#ede8df] hover:text-[#c8a882]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-sm rounded-lg gap-2',
};

/**
 * General-purpose button. Shows a spinner when `loading` is true and
 * disables interaction while loading or when `disabled` is set.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        font-medium tracking-tight
        transition-all duration-150
        cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        active:scale-[0.98]
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}
