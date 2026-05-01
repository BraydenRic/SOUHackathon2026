// Inline or full-screen animated spinner

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

/** Animated loading spinner. Use fullScreen to center in viewport, otherwise renders inline. */
export function LoadingSpinner({ fullScreen = false, size = 'md' }: LoadingSpinnerProps) {
  const spinner = (
    <svg
      className={`${sizeClasses[size]} animate-spin text-emerald-400`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950/80 z-50">
        {spinner}
      </div>
    );
  }

  return <span className="inline-flex items-center">{spinner}</span>;
}
