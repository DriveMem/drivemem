import { apiFetch } from "@/lib/api"

let lastSearchQuery = '';
let lastSearchTime = 0;

type FeedbackSignal = 'click' | 'thumbs_up' | 'thumbs_down' | 'dwell' | 'copy' | 'reformulation';

export function useSearchFeedback() {
  const sendFeedback = (params: {
    query: string;
    fileId?: string;
    signal: FeedbackSignal;
    metadata?: Record<string, any>;
  }) => {
    apiFetch('/api/search/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      silent: true,
    }).catch(() => {});
  };

  // Dwell tracking: call when user navigates to a result, returns cleanup fn
  const startDwell = (query: string, fileId: string) => {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      if (duration > 10000) { // >10s = positive signal
        sendFeedback({ query, fileId, signal: 'dwell', metadata: { durationMs: duration } });
      }
    };
  };

  // Copy tracking
  const trackCopy = (query: string, fileId: string) => {
    sendFeedback({ query, fileId, signal: 'copy' });
  };

  // Reformulation detection: search changed within 15s window
  const trackSearch = (query: string) => {
    const now = Date.now();
    if (lastSearchQuery && lastSearchQuery !== query && now - lastSearchTime < 15000) {
      sendFeedback({
        query: lastSearchQuery,
        signal: 'reformulation',
        metadata: { originalQuery: lastSearchQuery, newQuery: query },
      });
    }
    lastSearchQuery = query;
    lastSearchTime = now;
  };

  return { sendFeedback, startDwell, trackCopy, trackSearch };
}
