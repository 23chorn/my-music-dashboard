export default function PeriodDropdown({ value, onChange, options, label = "Period:" }) {
  const defaultOptions = [
    { value: "overall", label: "All Time" },
    { value: "7day", label: "Last 7 Days" },
    { value: "1month", label: "Last Month" },
    { value: "3month", label: "Last 3 Months" },
    { value: "6month", label: "Last 6 Months" },
    { value: "12month", label: "Last 12 Months" },
  ];
  const opts = options || defaultOptions;
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
      <label className="mr-0 sm:mr-2 text-sm sm:text-base">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-700 text-white p-1 rounded w-full sm:w-auto"
      >
        {opts.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}