import { useState, useEffect } from 'react';
import type { MemoryEntry } from '@/lib/types';
import { AGENTS } from '@/lib/constants';
import { fetchMemory } from '@/lib/api';
import DatePicker from './DatePicker';
import MemoryViewer from './MemoryViewer';

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMemory(date, agentFilter || undefined).then(data => {
      if (!cancelled) {
        setEntries(data);
        setExpandedIndex(0);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setEntries([]);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [date, agentFilter]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <DatePicker value={date} onChange={setDate} />
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-card text-secondary hover:border-gray-300 transition-colors cursor-pointer"
        >
          <option value="">All Agents</option>
          {AGENTS.map(a => (
            <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-gray-200 rounded-xl p-5 animate-pulse">
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
        <div className="space-y-4">
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
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{agent?.emoji ?? '📝'}</span>
                    <span className="text-sm font-medium text-primary">{agent?.name ?? entry.agent}</span>
                    <span className="text-xs text-tertiary">{entry.filename}</span>
                  </div>
                  <span className="text-xs text-tertiary transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isExpanded ? '2000px' : '0px', opacity: isExpanded ? 1 : 0 }}
                >
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <div className="pt-4">
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
