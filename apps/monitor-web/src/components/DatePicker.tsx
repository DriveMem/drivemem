interface Props {
  value: string;
}

export default function DatePicker({ value }: Props) {
  return (
    <input
      type="date"
      defaultValue={value === 'today' ? new Date().toISOString().slice(0, 10) : value}
      onChange={(e) => {
        window.location.href = `/memory/${e.target.value}`;
      }}
      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-card"
    />
  );
}
