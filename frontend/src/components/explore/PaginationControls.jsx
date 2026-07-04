import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function PaginationControls({
  currentPage,
  onPageChange,
  hasNextPage
}) {
  const [pageInput, setPageInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handlePageInputSubmit = () => {
    if (pageInput !== '') {
      const newPage = parseInt(pageInput);
      if (newPage >= 1) {
        onPageChange(newPage);
      }
    }
    setPageInput('');
    setIsEditing(false);
  };

  const handleFocus = (e) => {
    setIsEditing(true);
    setPageInput(currentPage.toString());
    // Select all text on focus for easy replacement
    setTimeout(() => {
      e.target.select();
    }, 0);
  };

  const handleBlur = () => {
    handlePageInputSubmit();
  };

  const handleClick = (e) => {
    if (!isEditing) {
      handleFocus(e);
    } else {
      e.target.select();
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 pl-2 pr-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-40 disabled:hover:bg-surface-800 text-surface-300 hover:text-white transition-colors font-mono text-xs"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Prev</span>
      </button>
      <div className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-sm px-2.5 py-1.5">
        <span className="font-display text-[10px] uppercase tracking-wide text-surface-500">Page</span>
        <input
          type="number"
          value={isEditing ? pageInput : currentPage}
          onChange={e => setPageInput(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handlePageInputSubmit();
            }
          }}
          className="bg-transparent text-surface-100 font-mono text-xs w-10 text-center focus:outline-none"
          min="1"
        />
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="flex items-center gap-1 pl-3 pr-2 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 disabled:opacity-40 disabled:hover:bg-surface-800 text-surface-300 hover:text-white transition-colors font-mono text-xs"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
