import StatusBadge from './StatusBadge';
import TaskCount from './TaskCount';
import type { Agent } from '@/lib/types';
import { relativeTime } from '@/lib/utils';

const borderColorMap: Record<Agent['status'], string> = {
  online: 'border-l-emerald-500',
  busy: 'border-l-amber-400',
  offline: 'border-l-red-400',
  unknown: 'border-l-neutral-300',
};

/** Agent 状态卡片 — Dashboard 中的单个 agent 展示 */
export default function AgentCard({ id, name, emoji, status, lastHeartbeat, tasks, currentTask }: Agent) {
  const hasBlocked = tasks.blocked > 0;
  const borderColor = hasBlocked ? 'border-l-orange-400' : borderColorMap[status];
  return (
    <a
      href={`/agent/${id}`}
      className={`group block rounded-xl border-l-4 border-solid ${borderColor} bg-card shadow-card p-5 sm:p-6 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl sm:text-4xl shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-page">{emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-base text-primary leading-tight">{name}</h3>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <TaskCount label="Active" count={tasks.active} color="blue" />
        <TaskCount label="Blocked" count={tasks.blocked} color="red" />
        <TaskCount label="Queue" count={tasks.queue} color="gray" />
        <TaskCount label="Done" count={tasks.done} color="green" />
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-tertiary">
        Last seen {relativeTime(lastHeartbeat)}
      </div>
    </a>
  );
}
