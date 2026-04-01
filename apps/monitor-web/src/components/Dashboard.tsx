import AgentCard from './AgentCard';
import RefreshIndicator from './RefreshIndicator';
import { fetchAgents } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';
import { formatTime } from '@/lib/utils';
import type { Agent } from '@/lib/types';

function sortAgents(agents: Agent[]): Agent[] {
  const priority = (a: Agent) => {
    if (a.status === 'offline') return 0;
    if (a.tasks.blocked > 0) return 1;
    if (a.status === 'busy') return 2;
    if (a.status === 'online') return 3;
    return 4; // unknown
  };
  return [...agents].sort((a, b) => priority(a) - priority(b));
}

/** Dashboard 主页面 — 展示所有 agent 状态卡片和全局统计 */
export default function Dashboard() {
  const { data: agents, loading, error, lastUpdated, refresh, isRefreshing } = usePolling({
    fetcher: fetchAgents,
    interval: 30000,
  });

  const list = agents ?? [];
  const sorted = sortAgents(list);
  const onlineCount = list.filter(a => a.status === 'online' || a.status === 'busy').length;
  const activeTaskCount = list.reduce((sum, a) => sum + a.tasks.active, 0);
  const offlineCount = list.filter(a => a.status === 'offline').length;
  const blockedTaskCount = list.reduce((sum, a) => sum + a.tasks.blocked, 0);
  const doneTaskCount = list.reduce((sum, a) => sum + a.tasks.done, 0);

  return (
    <div>
      {/* Hero header */}
      <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">龙虾系统监控站</h1>

        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {/* Global status bar */}
      {list.length > 0 && (
        <div className={`rounded-xl px-4 sm:px-5 py-3 sm:py-4 mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-3 ${
          offlineCount > 0 ? 'bg-red-50 border border-red-200' :
          blockedTaskCount > 0 ? 'bg-amber-50 border border-amber-200' :
          'bg-emerald-50 border border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {offlineCount > 0 ? (
              <span className="text-red-600 text-sm font-medium">🔴 {offlineCount} agent(s) offline</span>
            ) : blockedTaskCount > 0 ? (
              <span className="text-amber-600 text-sm font-medium">🟠 {blockedTaskCount} task(s) blocked</span>
            ) : (
              <span className="text-emerald-600 text-sm font-medium">✅ All systems operational</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-secondary">{onlineCount}/{list.length} Online</span>
            <span className="text-secondary">{activeTaskCount} Active</span>
            {blockedTaskCount > 0 && <span className="text-red-500 font-medium">{blockedTaskCount} Blocked</span>}
            <span className="text-tertiary">{doneTaskCount} Done today</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {sorted.map(agent => (
            <AgentCard key={agent.id} {...agent} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-tertiary mt-8 sm:mt-10">数据每 30 秒自动更新</p>
    </div>
  );
}
