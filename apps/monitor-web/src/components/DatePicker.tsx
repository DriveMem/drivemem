interface Props {
  value: string;
  onChange: (date: string) => void;
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function formatDateChinese(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 日期选择器 — 支持前后切换和直接选择日期 */
export default function DatePicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(shiftDate(value, -1))}
        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-gray-200 text-secondary hover:text-primary hover:border-gray-300 transition-colors text-sm"
        aria-label="前一天"
      >
        ←
      </button>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="text-sm text-secondary font-medium">
          {formatDateChinese(value)}
        </span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 sm:py-1 text-sm bg-card text-secondary hover:border-gray-300 transition-colors cursor-pointer"
        />
      </div>
      <button
        onClick={() => onChange(shiftDate(value, 1))}
        className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-gray-200 text-secondary hover:text-primary hover:border-gray-300 transition-colors text-sm"
        aria-label="后一天"
      >
        →
      </button>
    </div>
  );
}
