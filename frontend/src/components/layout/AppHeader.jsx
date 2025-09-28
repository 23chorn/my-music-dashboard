import { useNavigate } from "react-router-dom";
import SearchBar from "../navigation/SearchBar";
import SearchResultsDropdown from "../navigation/SearchResultsDropdown";
import MenuButton from "../navigation/MenuButton";

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
    <div className="w-full flex flex-col sm:flex-row items-center justify-center pt-4 gap-4 px-4 relative">
      <div className="absolute left-4 top-4">
        <MenuButton />
      </div>
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