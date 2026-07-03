import { XMarkIcon } from '@heroicons/react/24/outline';

export default function PlayCountFilters({ minPlays, maxPlays, onMinPlaysChange, onMaxPlaysChange, onClearFilters }) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium">Plays:</label>
      <input
        type="number"
        placeholder="Min"
        value={minPlays}
        onChange={e => onMinPlaysChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-surface-700 text-white p-1 rounded w-16 text-sm"
        min="0"
      />
      <span className="text-surface-400">-</span>
      <input
        type="number"
        placeholder="Max"
        value={maxPlays}
        onChange={e => onMaxPlaysChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-surface-700 text-white p-1 rounded w-16 text-sm"
        min="0"
      />
      {(minPlays !== '' || maxPlays !== '') && (
        <button
          onClick={onClearFilters}
          className="text-danger-400 hover:text-danger-300 text-sm ml-1"
          title="Clear filters"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}