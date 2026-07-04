import { XMarkIcon } from '@heroicons/react/24/outline';

export default function PlayCountFilters({ minPlays, maxPlays, onMinPlaysChange, onMaxPlaysChange, onClearFilters }) {
  return (
    <div className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-sm pl-2.5 pr-1.5 py-1.5">
      <span className="font-display text-[10px] uppercase tracking-wide text-surface-500">Plays</span>
      <input
        type="number"
        placeholder="Min"
        value={minPlays}
        onChange={e => onMinPlaysChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-transparent text-surface-100 font-mono text-xs w-12 text-center focus:outline-none placeholder:text-surface-600"
        min="0"
      />
      <span className="text-surface-600">–</span>
      <input
        type="number"
        placeholder="Max"
        value={maxPlays}
        onChange={e => onMaxPlaysChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-transparent text-surface-100 font-mono text-xs w-12 text-center focus:outline-none placeholder:text-surface-600"
        min="0"
      />
      {(minPlays !== '' || maxPlays !== '') && (
        <button
          onClick={onClearFilters}
          className="text-surface-500 hover:text-danger-400 transition-colors"
          title="Clear filters"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
