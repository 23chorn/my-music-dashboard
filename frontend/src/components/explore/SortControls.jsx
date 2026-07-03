export default function SortControls({ sortBy, onSortChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium">Sort by:</label>
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        className="bg-surface-700 text-white p-1 rounded"
      >
        <option value="plays">Number of Plays</option>
        <option value="alpha">Alphabetical</option>
      </select>
    </div>
  );
}