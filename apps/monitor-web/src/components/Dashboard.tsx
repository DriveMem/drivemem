import AgentCard from './AgentCard';
import RefreshIndicator from './RefreshIndicator';
import { fetchAgents } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatTime } from '@/lib/utils';

export default function Dashboard() {
  const { data: agents, loading, lastUpdated, refresh, isRefreshing } = usePolling({
    fetcher: fetchAgents,
    interval: 30000,
  });

  const list = agents ?? [];
  const onlineCount = list.filter(a => a.status === 'online' || a.status === 'busy').length;
  const activeTaskCount = list.reduce((sum, a) => sum + a.tasks.active, 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">龙虾系统监控站</h1>
          <p className="text-xs sm:text-sm text-tertiary mt-1 break-words">
            {onlineCount} agents online · {activeTaskCount} tasks active
            {lastUpdated && <span className="hidden sm:inline"> · Updated {formatTime(lastUpdated)}</span>}
          </p>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {list.map(agent => (
            <AgentCard key={agent.id} {...agent} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-tertiary mt-6 sm:mt-8">数据每 30 秒自动更新</p>
    </div>
  );
}
