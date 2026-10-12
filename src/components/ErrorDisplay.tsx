// ═══════════════════════════════════════════════════════════════
// ErrorDisplay — Consistent error message component
// ═══════════════════════════════════════════════════════════════

interface ErrorDisplayProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({
  title = 'Error',
  message,
  code,
  onRetry,
}: ErrorDisplayProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {code && (
            <p className="mt-1 text-xs text-red-500">Code: {code}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
