import { formatTime } from '@/lib/utils';

interface Props {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function RefreshIndicator({ lastUpdated, isRefreshing, onRefresh }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs text-tertiary">
      {lastUpdated && (
        <span className="hidden sm:inline">Updated {formatTime(lastUpdated)}</span>
      )}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center rounded-lg border border-gray-200 px-2.5 py-1.5 hover:text-secondary hover:border-gray-300 transition-colors disabled:opacity-50"
        aria-label="Refresh"
      >
        <span
          className={`inline-block text-sm ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ animationDuration: '0.8s' }}
        >
          ↻
        </span>
      </button>
    </div>
  );
}
