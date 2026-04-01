import { useCallback } from 'react';
import type { Agent, Task } from '@/lib/types';
import { fetchAgent, fetchAgentTasks } from '@/lib/api';
import { relativeTime } from '@/lib/utils';
import { usePolling } from '@/lib/usePolling';
import StatusBadge from './StatusBadge';
import TaskList from './TaskList';
import RefreshIndicator from './RefreshIndicator';

interface Props {
  agentId: string;
}

/** Agent 详情页 — 展示单个 agent 的完整信息和任务列表 */
export default function AgentDetail({ agentId }: Props) {
  const fetcher = useCallback(async () => {
    const [a, t] = await Promise.all([
      fetchAgent(agentId),
      fetchAgentTasks(agentId),
    ]);
    if (!a) throw new Error('Agent not found');
    return { agent: a, tasks: t };
  }, [agentId]);

  const { data, loading, error, lastUpdated, refresh, isRefreshing } = usePolling<{ agent: Agent; tasks: Task[] }>({
    fetcher,
    interval: 30000,
  });

  if (loading) return <Skeleton />;
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-2">😵 {error.message}</p>
      <a href="/" className="text-sm text-brand-500 hover:text-brand-600 hover:underline inline-block min-h-10 leading-10">← Back to Dashboard</a>
    </div>
  );
  if (!data) return null;

  const { agent, tasks } = data;
  const stats = agent.tasks;

  return (
    <div>
      {/* Back link + refresh */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <a href="/" className="text-sm text-tertiary hover:text-primary transition-colors min-h-10 inline-flex items-center gap-1">
          ← Dashboard
        </a>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {/* Agent info card */}
      <div className="bg-card border border-neutral-200/80 rounded-2xl shadow-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <span className="text-4xl sm:text-5xl leading-none flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-page shrink-0">{agent.emoji ?? '🤖'}</span>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-primary">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>

            <div className="text-sm text-tertiary space-y-1">
              <p title={new Date(agent.lastHeartbeat).toLocaleString('zh-CN')}>
                Last heartbeat: {relativeTime(agent.lastHeartbeat)}
              </p>
              {agent.currentTask && (
                <p className="text-secondary break-words mt-2 px-3 py-1.5 bg-brand-50 rounded-lg text-brand-600 text-sm inline-block">
                  🔧 {agent.currentTask}
                </p>
              )}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-100">
              <StatItem label="Active" value={stats.active} color="text-brand-600" />
              <StatItem label="Blocked" value={stats.blocked} color="text-red-500" />
              <StatItem label="Queue" value={stats.queue} color="text-secondary" />
              <StatItem label="Done" value={stats.done} color="text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="mt-8 sm:mt-10">
        <h2 className="text-lg font-bold text-primary mb-4 sm:mb-5">Tasks</h2>
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center py-3 rounded-xl bg-page/60">
      <div className={`text-2xl sm:text-3xl font-semibold tabular-nums leading-none ${value > 0 ? color : 'text-neutral-200'}`}>{value}</div>
      <div className="text-[10px] text-tertiary uppercase tracking-wider mt-2">{label}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-neutral-200 rounded mb-8" />
      <div className="bg-card border border-neutral-200/80 rounded-2xl shadow-card p-6 sm:p-8">
        <div className="flex items-start gap-6">
          <div className="h-20 w-20 bg-neutral-100 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 bg-neutral-200 rounded" />
            <div className="h-4 w-32 bg-neutral-100 rounded" />
            <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center py-3 rounded-xl bg-page/60 space-y-2">
                  <div className="h-8 w-10 bg-neutral-200 rounded mx-auto" />
                  <div className="h-3 w-12 bg-neutral-100 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 space-y-4">
        <div className="h-5 w-20 bg-neutral-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-neutral-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
