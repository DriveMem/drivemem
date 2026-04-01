import AgentCard from './AgentCard';
import RefreshIndicator from './RefreshIndicator';
import { fetchAgents } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatTime } from '@/lib/utils';

/** Dashboard 主页面 — 展示所有 agent 状态卡片和全局统计 */
export default function Dashboard() {
  const { data: agents, loading, error, lastUpdated, refresh, isRefreshing } = usePolling({
    fetcher: fetchAgents,
    interval: 30000,
  });

  const list = agents ?? [];
  const onlineCount = list.filter(a => a.status === 'online' || a.status === 'busy').length;
  const activeTaskCount = list.reduce((sum, a) => sum + a.tasks.active, 0);

  return (
    <div>
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4 mb-8 sm:mb-10">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">龙虾系统监控站</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {onlineCount} / {list.length} Online
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-sm font-medium">
              📋 {activeTaskCount} Active Tasks
            </span>
            {lastUpdated && (
              <span className="text-xs text-tertiary hidden sm:inline-flex items-center gap-1">
                Updated {formatTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 sm:py-20">
          <div className="text-4xl mb-4">😵</div>
          <p className="text-secondary mb-2">数据加载失败</p>
          <p className="text-xs text-tertiary mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors min-h-[44px]"
          >
            ↻ 重试
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 sm:py-20">
          <div className="text-4xl mb-4">🦞</div>
          <p className="text-secondary mb-2">暂无 Agent 数据</p>
          <p className="text-xs text-tertiary mb-4">系统可能还在初始化，稍后会自动刷新</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {list.map(agent => (
            <AgentCard key={agent.id} {...agent} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-tertiary mt-8 sm:mt-10">数据每 30 秒自动更新</p>
    </div>
  );
}
