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
    <div className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-sm pl-2.5 pr-1.5 py-1.5">
      <span className="font-display text-[10px] uppercase tracking-wide text-surface-500">Released</span>
      <input
        type="number"
        placeholder="From"
        value={releaseYearStart}
        onChange={e => onReleaseYearStartChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-transparent text-surface-100 font-mono text-xs w-14 text-center focus:outline-none placeholder:text-surface-600"
        min="1900"
        max={currentYear}
      />
      <span className="text-surface-600">–</span>
      <input
        type="number"
        placeholder="To"
        value={releaseYearEnd}
        onChange={e => onReleaseYearEndChange(e.target.value === '' ? '' : parseInt(e.target.value))}
        className="bg-transparent text-surface-100 font-mono text-xs w-14 text-center focus:outline-none placeholder:text-surface-600"
        min="1900"
        max={currentYear}
      />
      {(releaseYearStart !== '' || releaseYearEnd !== '') && (
        <button
          onClick={onClearFilter}
          className="text-surface-500 hover:text-danger-400 transition-colors"
          title="Clear release date filter"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
