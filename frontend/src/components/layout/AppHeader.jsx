import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import SearchBar from "../navigation/SearchBar";
import SearchResultsDropdown from "../navigation/SearchResultsDropdown";
import MenuButton from "../navigation/MenuButton";
import NavTabs from "../navigation/NavTabs";

export default function AppHeader({
  onSearch,
  searchBarRef,
  searchQuery,
  setSearchQuery,
  searchResults,
  onClose,
  dropdownRef,
  clearSearch
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if running as PWA (standalone mode)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true;

  // Check if we're not on the home page
  const showBackButton = isPWA && location.pathname !== '/';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center pt-4 gap-4 px-4">
      <div className="w-full lg:max-w-7xl lg:mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-center lg:justify-between">
        <div className="sm:absolute sm:left-4 lg:static flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors text-surface-300 hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
          <div className="lg:hidden">
            <MenuButton />
          </div>
          <NavTabs />
        </div>
        <div className="w-full sm:max-w-xl lg:flex-1 lg:max-w-2xl">
          <div className="relative w-full">
            <SearchBar
              onSearch={onSearch}
              ref={searchBarRef}
              value={searchQuery}
              setValue={setSearchQuery}
            />
            <SearchResultsDropdown
              results={searchResults}
              onSelectArtist={id => {
                clearSearch();
                navigate(`/artist/${id}`);
              }}
              onClose={onClose}
              dropdownRef={dropdownRef}
              navigate={navigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}