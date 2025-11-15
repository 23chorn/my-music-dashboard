import { BrowserRouter as Router } from "react-router-dom";
import useSearch from "./hooks/useSearch";
import { useServiceWorker } from "./hooks/useServiceWorker";
import AppLayout from "./components/layout/AppLayout";
import InstallPrompt from "./components/ui/InstallPrompt";

function AppContent() {
  // Register service worker
  useServiceWorker();

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

  return (
    <>
      <AppLayout searchProps={searchProps} />
      <InstallPrompt />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}