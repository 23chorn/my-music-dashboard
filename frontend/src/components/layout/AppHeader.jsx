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
    <div className="w-full flex flex-col items-center justify-center pt-4 gap-4 px-4">
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-center">
        <div className="sm:absolute sm:left-4">
          <MenuButton />
        </div>
        <div className="w-full sm:max-w-xl">
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