import type { Task } from '@/lib/types';
import TaskStatusBadge from './TaskStatusBadge';
import { relativeTime } from '@/lib/utils';

interface Props {
  tasks: Task[];
}

const GROUP_ORDER: Task['status'][] = ['active', 'blocked', 'queue', 'done'];

const dotColor: Record<Task['status'], string> = {
  active: 'bg-blue-500',
  blocked: 'bg-red-500',
  queue: 'bg-gray-400',
  done: 'bg-green-500',
};

const DONE_LIMIT = 5;

export default function TaskList({ tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400">No tasks yet.</p>;
  }

  const grouped = GROUP_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map((group) => {
        const items = group.status === 'done' ? group.items.slice(0, DONE_LIMIT) : group.items;
        const hasMore = group.status === 'done' && group.items.length > DONE_LIMIT;

        return (
          <section key={group.status}>
            <h3 className="flex items-center gap-2 text-base font-medium text-gray-900 mb-3">
              <span className={`h-2.5 w-2.5 rounded-full ${dotColor[group.status]}`} />
              {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
              <span className="text-sm text-gray-400 font-normal">({group.items.length})</span>
            </h3>

            <ul className="space-y-3">
              {items.map((task) => (
                <li
                  key={task.id}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-sm text-gray-900 truncate">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {task.checkpoint && (
                    <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{task.checkpoint}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span>created {relativeTime(task.created_at)}</span>
                    <span>·</span>
                    <span>updated {relativeTime(task.updated_at)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {hasMore && (
              <p className="mt-2 text-xs text-gray-400">
                … and {group.items.length - DONE_LIMIT} more completed tasks
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
