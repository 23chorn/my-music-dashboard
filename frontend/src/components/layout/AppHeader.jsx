import { useNavigate } from "react-router-dom";
import SearchBar from "../SearchBar";
import SearchResultsDropdown from "../SearchResultsDropdown";
import MenuButton from "../MenuButton";

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

  return (
    <div className="w-full flex flex-col sm:flex-row items-start justify-between px-2 sm:px-6 pt-4 gap-4">
      <MenuButton />
      <div className="w-full max-w-xl">
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
  );
}