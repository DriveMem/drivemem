import type { MemoryEntry } from '@/lib/types';

interface Props {
  date: string;
  entries: MemoryEntry[];
}

export default function MemoryViewer({ date, entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-secondary">
        <p>No memory entries for {date}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.filename} className="bg-card border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-secondary">{entry.agent}</span>
            <span className="text-xs text-tertiary">{entry.filename}</span>
          </div>
          {entry.content && (
            <pre className="text-sm whitespace-pre-wrap">{entry.content}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
