import { useState, useEffect, useCallback } from 'react';
import AgentCard from './AgentCard';
import { fetchAgents } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import type { Agent } from '@/lib/types';

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const onlineCount = agents.filter(a => a.status === 'online' || a.status === 'busy').length;
  const activeTaskCount = agents.reduce((sum, a) => sum + a.tasks.active, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">龙虾系统监控站</h1>
          <p className="text-sm text-tertiary mt-1">
            {onlineCount} agents online · {activeTaskCount} tasks active · Last updated {formatTime(lastUpdated)}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-tertiary hover:text-secondary border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map(agent => (
          <AgentCard key={agent.id} {...agent} />
        ))}
      </div>

      <p className="text-center text-xs text-tertiary mt-8">数据每 30 秒自动更新</p>
    </div>
  );
}
