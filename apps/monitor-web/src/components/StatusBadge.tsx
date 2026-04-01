import type { Agent } from '@/lib/types';

const colorMap: Record<Agent['status'], string> = {
  online: 'bg-status-online/20 text-green-700',
  busy: 'bg-status-busy/20 text-yellow-700',
  offline: 'bg-status-offline/20 text-red-700',
  unknown: 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }: { status: Agent['status'] }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-lg ${colorMap[status]}`}>
      {status}
    </span>
  );
}
