import StatusBadge from './StatusBadge';
import TaskCount from './TaskCount';
import type { Agent } from '@/lib/types';
import { relativeTime } from '@/lib/utils';

/** Agent 状态卡片 — Dashboard 中的单个 agent 展示 */
export default function AgentCard({ id, name, emoji, status, lastHeartbeat, tasks, currentTask }: Agent) {
  const isOffline = status === 'offline';
  return (
    <a
      href={`/agent/${id}`}
      className={`group block rounded-xl border border-gray-100 bg-card p-4 sm:p-5 transition-all duration-200 hover:shadow-sm hover:border-gray-200 ${isOffline ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl shrink-0">{emoji}</span>
          <div className="min-w-0">
            <h3 className="font-medium text-[15px] text-primary">{name}</h3>
            {currentTask && (
              <p className="text-xs text-secondary truncate max-w-[200px] mt-0.5">{currentTask}</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 sm:mt-4 grid grid-cols-4 gap-2 sm:flex sm:gap-3">
        <TaskCount label="Active" count={tasks.active} color="blue" />
        <TaskCount label="Blocked" count={tasks.blocked} color="red" />
        <TaskCount label="Queue" count={tasks.queue} color="gray" />
        <TaskCount label="Done" count={tasks.done} color="green" />
      </div>

      <div className="mt-3 text-xs text-tertiary">
        Last seen {relativeTime(lastHeartbeat)}
      </div>
    </a>
  );
}
