import { BrowserRouter as Router } from "react-router-dom";
import useSearch from "./hooks/useSearch";
import AppLayout from "./components/layout/AppLayout";

function AppContent() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchBarRef,
    dropdownRef,
    handleSearch,
    clearSearch
  } = useSearch();

  const searchProps = {
    onSearch: handleSearch,
    searchBarRef,
    searchQuery,
    setSearchQuery,
    searchResults,
    onClose: () => setSearchResults(null),
    dropdownRef,
    clearSearch
  };

  return <AppLayout searchProps={searchProps} />;
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}