import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Discovery from "./pages/Discovery";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "history":
        return <History />;
      case "discovery":
        return <Discovery />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-6 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">My Music Stats</h1>
        <nav className="flex flex-col space-y-4">
          <button
            className={`text-left px-4 py-2 rounded ${activePage === "dashboard" ? "bg-gray-700" : "hover:bg-gray-700"}`}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`text-left px-4 py-2 rounded ${activePage === "history" ? "bg-gray-700" : "hover:bg-gray-700"}`}
            onClick={() => setActivePage("history")}
          >
            History
          </button>
          <button
            className={`text-left px-4 py-2 rounded ${activePage === "discovery" ? "bg-gray-700" : "hover:bg-gray-700"}`}
            onClick={() => setActivePage("discovery")}
          >
            Discovery
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}