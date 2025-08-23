import { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { searchAll } from "./data/searchApi";
import SidePanel from "./components/SidePanel";
import Dashboard from "./pages/Dashboard";
import ArtistView from "./pages/ArtistView";
import ExploreView from "./pages/ExploreView";
import SearchBar from "./components/SearchBar";
import SearchResultsDropdown from "./components/SearchResultsDropdown";

function AppContent() {
  const [collapsed, setCollapsed] = useState(true);
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
    if (searchResults) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchResults]);

  async function handleSearch(query) {
    setSearchLoading(true);
    try {
      const results = await searchAll(query);
      setSearchResults(results);
    } catch {
      setSearchResults(null);
    }
    setSearchLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <SidePanel collapsed={collapsed} setCollapsed={setCollapsed}>
        <nav className="flex flex-col gap-4 px-2">
          <Link
            to="/"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition ${
              window.location.pathname === "/" ? "border-l-4 border-blue-500" : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/explore"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-blue-400 font-medium transition ${
              window.location.pathname === "/explore" ? "border-l-4 border-blue-500" : ""
            }`}
          >
            Explore
          </Link>
        </nav>
      </SidePanel>
      <div className={`w-full flex flex-col transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"}`}>
        {/* Attach search bar and dropdown together */}
        <div className="flex justify-center mt-6 mb-4">
          <div className="relative w-full max-w-xl">
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
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/artist/:id" element={<ArtistView />} />
            <Route path="/explore" element={<ExploreView />} />
          </Routes>
        </main>
      </div>
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