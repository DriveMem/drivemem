import type { Task } from '@/lib/types';

const styles: Record<Task['status'], { bg: string; text: string }> = {
  active:  { bg: 'bg-blue-50',  text: 'text-blue-600' },
  blocked: { bg: 'bg-red-50',   text: 'text-red-600' },
  queue:   { bg: 'bg-gray-100', text: 'text-gray-600' },
  done:    { bg: 'bg-green-50', text: 'text-green-600' },
};

/** 任务状态徽章 — 带背景色的任务状态标签 */
export default function TaskStatusBadge({ status }: { status: Task['status'] }) {
  const s = styles[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {status}
    </span>
  );
}
