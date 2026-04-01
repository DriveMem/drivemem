import { useState, useEffect, useCallback } from 'react';
import type { MemoryEntry } from '@/lib/types';
import { AGENTS } from '@/lib/constants';
import { fetchMemory } from '@/lib/api';
import DatePicker from './DatePicker';
import MemoryViewer from './MemoryViewer';
import RefreshIndicator from './RefreshIndicator';

interface Props {
  initialDate: string;
}

const agentMap = Object.fromEntries(AGENTS.map(a => [a.id, a]));

export default function MemoryBrowser({ initialDate }: Props) {
  const defaultDate = initialDate || new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate);
  const [agentFilter, setAgentFilter] = useState('');
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchMemory(date, agentFilter || undefined);
      setEntries(data);
      setExpandedIndex(0);
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
            className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 text-sm bg-card text-secondary hover:border-gray-300 transition-colors cursor-pointer min-h-10 sm:min-h-0"
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
            <div key={i} className="bg-card border border-gray-200 rounded-xl p-4 sm:p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📭</p>
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
                className="bg-card border border-gray-200 rounded-xl overflow-hidden transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                  className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 text-left min-h-12"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-base sm:text-lg shrink-0">{agent?.emoji ?? '📝'}</span>
                    <span className="text-sm font-medium text-primary truncate">{agent?.name ?? entry.agent}</span>
                    <span className="text-xs text-tertiary truncate hidden sm:inline">{entry.filename}</span>
                  </div>
                  <span className="text-xs text-tertiary transition-transform shrink-0 ml-2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isExpanded ? '2000px' : '0px', opacity: isExpanded ? 1 : 0 }}
                >
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
                    <div className="pt-3 sm:pt-4 overflow-x-auto">
                      {entry.content ? (
                        <MemoryViewer content={entry.content} />
                      ) : (
                        <p className="text-sm text-tertiary italic">No content available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
