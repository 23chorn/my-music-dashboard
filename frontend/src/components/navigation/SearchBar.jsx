import { forwardRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const SearchBar = forwardRef(function SearchBar(
  { onSearch, placeholder = "Search artists, albums, tracks...", value, setValue },
  ref
) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(value.trim());
  };

  return (
    <form
      ref={ref}
      className="flex items-end gap-2 w-full border-b-2 border-surface-600 focus-within:border-brand-400 transition-colors"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        className="flex-1 bg-transparent font-mono text-white placeholder:text-surface-500 py-2 focus:outline-none"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button
        type="submit"
        aria-label="Search"
        className="p-2 text-surface-500 hover:text-brand-400 transition-colors"
      >
        <MagnifyingGlassIcon className="w-5 h-5" />
      </button>
    </form>
  );
});

export default SearchBar;