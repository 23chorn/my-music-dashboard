export default function StatCard({ title, value, subtitle, color = "text-white", onClick, clickable = false }) {
  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 text-center ${
        clickable ? 'cursor-pointer hover:bg-gray-700 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      {clickable && <p className="text-xs text-blue-400 mt-1">Click for details</p>}
    </div>
  );
}