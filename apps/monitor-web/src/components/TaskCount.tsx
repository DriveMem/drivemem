const colorMap: Record<string, { active: string; zero: string }> = {
  blue:  { active: 'text-brand-600', zero: 'text-neutral-200' },
  red:   { active: 'text-red-500', zero: 'text-neutral-200' },
  gray:  { active: 'text-secondary', zero: 'text-neutral-200' },
  green: { active: 'text-emerald-500', zero: 'text-neutral-200' },
};

interface Props {
  label: string;
  count: number;
  color: string;
}

/** 任务数量指示器 — AgentCard 中的单个任务状态计数 */
export default function TaskCount({ label, count, color }: Props) {
  const c = colorMap[color] ?? colorMap.gray;
  const isBlockedAlert = label === 'Blocked' && count > 0;

  if (isBlockedAlert) {
    return (
      <div className="flex flex-col items-center min-w-[44px] py-2 px-1 rounded-lg bg-red-50">
        <span className="text-xl font-semibold tabular-nums leading-none text-red-500">
          ⚠️ {count}
        </span>
        <span className="text-[10px] text-red-400 uppercase tracking-wider mt-1.5">Blocked</span>
      </div>
    );
  }

  const textColor = count > 0 ? c.active : c.zero;
  const isDone = label === 'Done';
  const doneColor = count > 0 ? 'text-emerald-300' : c.zero;

  return (
    <div className="flex flex-col items-center min-w-[44px] py-2 px-1 rounded-lg bg-page/60">
      <span className={`text-xl font-semibold tabular-nums leading-none ${isDone ? doneColor : textColor}`}>{count}</span>
      <span className="text-[10px] text-tertiary uppercase tracking-wider mt-1.5">{label}</span>
    </div>
  );
}
