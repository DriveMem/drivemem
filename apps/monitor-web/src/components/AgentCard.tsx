import StatusBadge from './StatusBadge';
import type { Agent } from '@/lib/types';

type Props = Pick<Agent, 'status'> & {
  id: string;
  name: string;
  emoji: string;
};

export default function AgentCard({ id, name, emoji, status }: Props) {
  return (
    <a
      href={`/agent/${id}`}
      className="block bg-card border border-gray-200 rounded-xl p-5 hover:bg-hover transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{emoji}</span>
        <span className="font-medium">{name}</span>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-secondary">Agent details →</p>
    </a>
  );
}
