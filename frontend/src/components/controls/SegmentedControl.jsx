export default function SegmentedControl({ options, value, onChange, className = "" }) {
  return (
    <div className={`inline-flex bg-surface-800 border border-surface-700 rounded-sm divide-x divide-surface-700 overflow-hidden ${className}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors ${
            opt.value === value
              ? "bg-brand-600 text-white"
              : "text-surface-300 hover:bg-surface-700 hover:text-surface-100"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
