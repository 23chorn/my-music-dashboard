import { forwardRef } from "react";

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
      className="flex flex-col sm:flex-row items-stretch gap-2 mb-6 w-full"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        className="px-4 py-2 rounded bg-gray-800 text-white focus:outline-none focus:ring focus:ring-blue-400 w-full"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-2 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition w-full sm:w-auto"
      >
        Search
      </button>
    </form>
  );
});

export default SearchBar;