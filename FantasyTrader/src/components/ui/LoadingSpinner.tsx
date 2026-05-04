// Animated spinner used for page loads and button loading states

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-8 w-8' };

/**
 * Animated SVG spinner. When `fullScreen` is true, renders as a fixed overlay
 * covering the entire viewport — used for page-level loading states.
 */
export function LoadingSpinner({ fullScreen = false, size = 'md' }: LoadingSpinnerProps) {
  const spinner = (
    <svg className={`${sizeClasses[size]} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-20"
        cx="12" cy="12" r="10"
        stroke="#c8a882" strokeWidth="3"
      />
      <path
        className="opacity-80"
        fill="#c8a882"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0908]/90 z-50">
        {spinner}
      </div>
    );
  }

  return <span className="inline-flex items-center">{spinner}</span>;
}
