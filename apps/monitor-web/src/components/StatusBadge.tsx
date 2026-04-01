import type { Agent } from '@/lib/types';

const dotColor: Record<Agent['status'], string> = {
  online: 'bg-emerald-400',
  busy: 'bg-amber-400',
  offline: 'bg-gray-300',
  unknown: 'bg-gray-300',
};

const labelColor: Record<Agent['status'], string> = {
  online: 'text-emerald-600',
  busy: 'text-amber-600',
  offline: 'text-gray-400',
  unknown: 'text-gray-400',
};

/** Agent 状态徽章 — 带颜色圆点的状态标签 */
export default function StatusBadge({ status }: { status: Agent['status'] }) {
  const pulse = status === 'online' ? 'animate-pulse' : '';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${labelColor[status]}`}>
      <span className={`h-2 w-2 rounded-full ${dotColor[status]} ${pulse}`} />
      {status}
    </span>
  );
}
