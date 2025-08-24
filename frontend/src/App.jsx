import { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ArtistView from "./pages/ArtistView";
import ExploreView from "./pages/ExploreView";
import SearchBar from "./components/SearchBar";
import SearchResultsDropdown from "./components/SearchResultsDropdown";
import MenuButton from "./components/MenuButton";

function AppContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const navigate = useNavigate();
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
      const { searchAll } = await import("./data/searchApi");
      const results = await searchAll(query);
      setSearchResults(results);
    } catch {
      setSearchResults(null);
    }
    setSearchLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-gray-950 w-full flex-col">
      {/* Responsive header bar for menu and search */}
      <div className="w-full flex flex-col sm:flex-row items-start justify-between px-2 sm:px-6 pt-4 gap-4">
        <MenuButton />
        <div className="w-full max-w-xl">
          <div className="relative w-full">
            <SearchBar
              onSearch={handleSearch}
              ref={searchBarRef}
              value={searchQuery}
              setValue={setSearchQuery}
            />
            <SearchResultsDropdown
              results={searchResults}
              onSelectArtist={id => {
                setSearchResults(null);
                setSearchQuery("");
                navigate(`/artist/${id}`);
              }}
              onClose={() => setSearchResults(null)}
              dropdownRef={dropdownRef}
              navigate={navigate}
            />
          </div>
        </div>
      </div>
      <main className="flex-1 p-4 w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/artist/:id" element={<ArtistView />} />
          <Route path="/explore" element={<ExploreView />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}