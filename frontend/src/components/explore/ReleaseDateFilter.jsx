import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ReleaseDateFilter({
  releaseYearStart,
  releaseYearEnd,
  onReleaseYearStartChange,
  onReleaseYearEndChange,
  onClearFilter
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex items-center gap-2">
      <label className="font-medium">Release Year:</label>
      <input
        type="number"
        placeholder="From"
        value={releaseYearStart}
        onChange={e => onReleaseYearStartChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-surface-700 text-white p-1 rounded w-20 text-sm"
        min="1900"
        max={currentYear}
      />
      <span className="text-surface-400">-</span>
      <input
        type="number"
        placeholder="To"
        value={releaseYearEnd}
        onChange={e => onReleaseYearEndChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-surface-700 text-white p-1 rounded w-20 text-sm"
        min="1900"
        max={currentYear}
      />
      {(releaseYearStart !== '' || releaseYearEnd !== '') && (
        <button
          onClick={onClearFilter}
          className="text-danger-400 hover:text-danger-300 text-sm ml-1"
          title="Clear release date filter"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
