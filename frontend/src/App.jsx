import { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { searchAll } from "./data/searchApi";
import SidePanel from "./components/SidePanel";
import Dashboard from "./pages/Dashboard";
import Discovery from "./pages/Discovery";
import History from "./pages/History";
import ArtistView from "./pages/ArtistView";
import ExploreView from "./pages/ExploreView";

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

  async function handleSearch(e) {
    e.preventDefault();
    setSearchLoading(true);
    try {
      const results = await searchAll(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults(null);
    }
    setSearchLoading(false);
  }

  function handleSelectArtist(id) {
    setSearchResults(null);
    setSearchQuery("");
    navigate(`/artist/${id}`);
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
            to="/discovery"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition ${
              window.location.pathname === "/discovery" ? "border-l-4 border-blue-500" : ""
            }`}
          >
            Discovery
          </Link>
          <Link
            to="/history"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition ${
              window.location.pathname === "/history" ? "border-l-4 border-blue-500" : ""
            }`}
          >
            History
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"}`}>
        {/* Search bar and dropdown in a relative container */}
        <div className="relative">
          <form
            ref={searchBarRef}
            onSubmit={handleSearch}
            className="flex gap-2 p-4 bg-gray-900"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search artist, track, or album"
              className="flex-1 p-2 rounded border"
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Search
            </button>
          </form>
          {/* Search results dropdown */}
          {searchResults && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 mt-1 max-w-xl w-full z-50 bg-gray-900 border border-gray-700 shadow-lg rounded-lg p-4 text-gray-100"
            >
              <div>
                <h3 className="font-bold mb-2 text-gray-200">Artists</h3>
                <ul>
                  {searchResults.artists.length === 0 && <li className="text-gray-400">No artists found.</li>}
                  {searchResults.artists.map(artist => (
                    <li
                      key={artist.id}
                      className="mb-1 px-2 py-1 hover:bg-gray-800 rounded cursor-pointer"
                      onClick={() => {
                        setSearchResults(null); // close dropdown
                        setSearchQuery("");     // clear search bar
                        navigate(`/artist/${artist.id}`);
                      }}
                    >
                      {artist.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <h3 className="font-bold mb-2 text-gray-200">Tracks</h3>
                <ul>
                  {searchResults.tracks.length === 0 && <li className="text-gray-400">No tracks found.</li>}
                  {searchResults.tracks.map(track => (
                    <li key={track.id} className="mb-1 px-2 py-1 hover:bg-gray-800 rounded">
                      {track.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <h3 className="font-bold mb-2 text-gray-200">Albums</h3>
                <ul>
                  {searchResults.albums.length === 0 && <li className="text-gray-400">No albums found.</li>}
                  {searchResults.albums.map(album => (
                    <li key={album.id} className="mb-1 px-2 py-1 hover:bg-gray-800 rounded">
                      {album.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/history" element={<History />} />
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