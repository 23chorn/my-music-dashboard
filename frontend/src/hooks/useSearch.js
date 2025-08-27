import { useState, useRef, useEffect } from "react";

export default function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchBarRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target)
      ) {
        setSearchResults(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchResults]);

  async function handleSearch(query) {
    setSearchLoading(true);
    try {
      const { searchAll } = await import("../data/searchApi");
      const results = await searchAll(query);
      setSearchResults(results);
    } catch {
      setSearchResults(null);
    }
    setSearchLoading(false);
  }

  function clearSearch() {
    setSearchResults(null);
    setSearchQuery("");
  }

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchLoading,
    searchBarRef,
    dropdownRef,
    handleSearch,
    clearSearch
  };
}