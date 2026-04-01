import type { Task } from '@/lib/types';

interface Props {
  tasks: Task[];
}

export default function TaskList({ tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-tertiary">No tasks yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id} className="bg-card border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{task.title}</span>
            <span className="text-xs text-secondary">{task.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
