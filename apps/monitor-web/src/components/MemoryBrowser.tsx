import { useState, useEffect, useCallback } from 'react';
import type { MemoryEntry } from '@/lib/types';
import { AGENTS } from '@/lib/constants';
import { fetchMemory, fetchMemoryContent } from '@/lib/api';
import DatePicker from './DatePicker';
import MemoryViewer from './MemoryViewer';
import RefreshIndicator from './RefreshIndicator';

interface Props {
  initialDate: string;
}

const agentMap = Object.fromEntries(AGENTS.map(a => [a.id, a]));

/** Memory 浏览器 — 按日期和 agent 筛选蒸馏记录 */
export default function MemoryBrowser({ initialDate }: Props) {
  const defaultDate = initialDate || new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate);
  const [agentFilter, setAgentFilter] = useState('');
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  const [loadingContent, setLoadingContent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(-1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchMemory(date, agentFilter || undefined);
      setEntries(data);
      setExpandedIndex(-1);
      setContentCache({});
      setLastUpdated(new Date());
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [date, agentFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Load content for expanded entry
  const loadContent = useCallback(async (entry: MemoryEntry) => {
    const key = `${entry.agent}/${entry.filename}`;
    if (contentCache[key] || loadingContent[key]) return;
    setLoadingContent(prev => ({ ...prev, [key]: true }));
    try {
      const content = await fetchMemoryContent(entry.agent, entry.filename);
      setContentCache(prev => ({ ...prev, [key]: content || '(empty)' }));
    } catch {
      setContentCache(prev => ({ ...prev, [key]: '(failed to load)' }));
    } finally {
      setLoadingContent(prev => ({ ...prev, [key]: false }));
    }
  }, [contentCache, loadingContent]);

  // Auto-load content when expanding
  const handleExpand = useCallback((idx: number) => {
    if (expandedIndex === idx) {
      setExpandedIndex(-1);
    } else {
      setExpandedIndex(idx);
      if (entries[idx]) loadContent(entries[idx]);
    }
  }, [expandedIndex, entries, loadContent]);

  const handleRefresh = useCallback(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-6 sm:mb-8">
        <DatePicker value={date} onChange={setDate} />
        <div className="flex items-center gap-2">
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="flex-1 sm:flex-none border border-neutral-200/80 rounded-lg px-3 py-2 sm:py-1.5 text-sm bg-card text-secondary hover:border-neutral-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors cursor-pointer min-h-10 sm:min-h-0"
          >
            <option value="">All Agents</option>
            {AGENTS.map(a => (
              <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
            ))}
          </select>
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-neutral-200/80 rounded-xl shadow-card p-4 sm:p-5 animate-pulse">
              <div className="h-4 bg-neutral-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-neutral-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-secondary text-sm">该日期暂无记录</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {entries.map((entry, idx) => {
            const agent = agentMap[entry.agent];
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={entry.filename}
                className="bg-card border border-neutral-200/80 rounded-xl shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover"
              >
                <button
                  onClick={() => handleExpand(idx)}
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 text-left min-h-12 group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-page">{agent?.emoji ?? '📝'}</span>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-primary block">{agent?.name ?? entry.agent}</span>
                      <span className="text-[11px] text-tertiary truncate block">{entry.filename}</span>
                    </div>
                  </div>
                  <span className="text-xs text-tertiary transition-transform duration-200 shrink-0 ml-2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>
                {isExpanded && (
                <div className="border-t border-neutral-100">
                  <div className="px-4 sm:px-5 pb-5 sm:pb-6">
                    <div className="pt-4 sm:pt-5 overflow-x-auto">
                      {(() => {
                        const key = `${entry.agent}/${entry.filename}`;
                        const cached = contentCache[key];
                        const isLoading = loadingContent[key];
                        if (isLoading) return <div className="h-20 bg-neutral-50 rounded-lg animate-pulse" />;
                        if (cached) return <MemoryViewer content={cached} />;
                        return <p className="text-sm text-tertiary italic">Loading...</p>;
                      })()}
                    </div>
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
