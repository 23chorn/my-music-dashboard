export default function StatCard({ title, value, subtitle, color = "text-white", onClick, clickable = false }) {
  return (
    <div
      className={`bg-surface-800 rounded p-4 ${
        clickable ? 'cursor-pointer hover:bg-surface-700 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <h3 className="font-display text-xs uppercase tracking-widest text-surface-400 mb-2">{title}</h3>
      <div className={`font-mono text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {subtitle && (
        <p className="text-xs text-surface-500 mt-2 pt-2 border-t border-surface-700">{subtitle}</p>
      )}
      {clickable && <p className="text-xs text-brand-400 mt-1">Click for details</p>}
    </div>
  );
}