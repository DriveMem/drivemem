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
      <a href="/" className="text-sm text-blue-500 hover:underline inline-block min-h-10 leading-10">← Back to Dashboard</a>
    </div>
  );
  if (!data) return null;

  const { agent, tasks } = data;
  const stats = agent.tasks;

  return (
    <div>
      {/* Back link + refresh */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-10 inline-flex items-center">
          ← Dashboard
        </a>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refresh} />
      </div>

      {/* Agent info card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <span className="text-4xl sm:text-5xl leading-none">{agent.emoji ?? '🤖'}</span>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              <p title={new Date(agent.lastHeartbeat).toLocaleString('zh-CN')}>
                Last heartbeat: {relativeTime(agent.lastHeartbeat)}
              </p>
              {agent.currentTask && (
                <p className="text-gray-600 break-words">
                  🔧 {agent.currentTask}
                </p>
              )}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 sm:flex sm:items-center sm:gap-6 mt-4 pt-4 border-t border-gray-100">
              <StatItem label="Active" value={stats.active} color="text-blue-600" />
              <StatItem label="Blocked" value={stats.blocked} color="text-red-500" />
              <StatItem label="Queue" value={stats.queue} color="text-gray-500" />
              <StatItem label="Done" value={stats.done} color="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="mt-8 sm:mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-5">Tasks</h2>
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg sm:text-xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-8" />
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8">
        <div className="flex items-start gap-5">
          <div className="h-14 w-14 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="h-6 w-8 bg-gray-200 rounded mx-auto" />
                  <div className="h-3 w-10 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 space-y-4">
        <div className="h-5 w-20 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
