export default function PlayCountFilters({ minPlays, maxPlays, onMinPlaysChange, onMaxPlaysChange, onClearFilters }) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium">Plays:</label>
      <input
        type="number"
        placeholder="Min"
        value={minPlays}
        onChange={e => onMinPlaysChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-gray-700 text-white p-1 rounded w-16 text-sm"
        min="0"
      />
      <span className="text-gray-400">-</span>
      <input
        type="number"
        placeholder="Max"
        value={maxPlays}
        onChange={e => onMaxPlaysChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-gray-700 text-white p-1 rounded w-16 text-sm"
        min="0"
      />
      {(minPlays !== '' || maxPlays !== '') && (
        <button
          onClick={onClearFilters}
          className="text-red-400 hover:text-red-300 text-sm ml-1"
          title="Clear filters"
        >
          ✕
        </button>
      )}
    </div>
  );
}