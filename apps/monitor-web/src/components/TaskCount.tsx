const colorMap: Record<string, { active: string; zero: string }> = {
  blue:  { active: 'text-blue-600', zero: 'text-gray-300' },
  red:   { active: 'text-red-500', zero: 'text-gray-300' },
  gray:  { active: 'text-gray-500', zero: 'text-gray-300' },
  green: { active: 'text-emerald-600', zero: 'text-gray-300' },
};

interface Props {
  label: string;
  count: number;
  color: string;
}

export default function TaskCount({ label, count, color }: Props) {
  const c = colorMap[color] ?? colorMap.gray;
  const textColor = count > 0 ? c.active : c.zero;
  return (
    <div className="flex flex-col items-center min-w-[40px]">
      <span className={`text-sm font-semibold tabular-nums ${textColor}`}>{count}</span>
      <span className="text-[10px] text-tertiary uppercase tracking-wide">{label}</span>
    </div>
  );
}
