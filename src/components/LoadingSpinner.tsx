// ═══════════════════════════════════════════════════════════════
// LoadingSpinner — Consistent loading indicator
// ═══════════════════════════════════════════════════════════════

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="text-center">
        <div
          className={`mx-auto animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
        />
        {message && (
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        )}
      </div>
    </div>
  );
}
