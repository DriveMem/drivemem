import type { Agent } from '@/lib/types';

const pillBg: Record<Agent['status'], string> = {
  online: 'bg-emerald-50',
  busy: 'bg-amber-50',
  offline: 'bg-neutral-100',
  unknown: 'bg-neutral-100',
};

const labelColor: Record<Agent['status'], string> = {
  online: 'text-emerald-700',
  busy: 'text-amber-700',
  offline: 'text-neutral-400',
  unknown: 'text-neutral-400',
};

/** Agent 状态徽章 — 带颜色圆点的状态标签 */
export default function StatusBadge({ status }: { status: Agent['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${pillBg[status]} ${labelColor[status]}`}>
      {status === 'online' ? (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      ) : status === 'busy' ? (
        <span className="h-2 w-2 rounded-full bg-amber-400" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
      )}
      {status}
    </span>
  );
}
