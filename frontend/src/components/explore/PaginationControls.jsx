import { useState } from 'react';

export default function PaginationControls({ 
  currentPage, 
  onPageChange, 
  hasNextPage, 
  pageSize 
}) {
  const [pageInput, setPageInput] = useState('');

  const handlePageInputSubmit = () => {
    if (pageInput !== '') {
      const newPage = parseInt(pageInput);
      if (newPage >= 1) {
        onPageChange(newPage);
      }
      setPageInput('');
    }
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
      >
        Prev
      </button>
      <div className="flex items-center gap-2">
        <span className="font-medium text-blue-400">Page</span>
        <input
          type="number"
          value={pageInput !== '' ? pageInput : currentPage}
          onChange={e => setPageInput(e.target.value)}
          onBlur={handlePageInputSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handlePageInputSubmit();
            }
          }}
          className="bg-gray-700 text-white p-1 rounded w-16 text-center text-sm"
          min="1"
        />
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}