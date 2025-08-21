import { useState } from "react";
import SidePanel from "./components/sidePanel";
import Dashboard from "./pages/Dashboard";
import Discovery from "./pages/Discovery";
import History from "./pages/History";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(true);

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
    <div className="flex min-h-screen bg-gray-950">
      <SidePanel collapsed={collapsed} setCollapsed={setCollapsed}>
        <nav className="flex flex-col gap-4 px-2">
          <a
            href="/"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition ${
              activePage === "dashboard" ? "border-l-4 border-blue-500" : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              setActivePage("dashboard");
            }}
          >
            Dashboard
          </a>
          <a
            href="/discovery"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition ${
              activePage === "discovery" ? "border-l-4 border-blue-500" : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              setActivePage("discovery");
            }}
          >
            Discovery
          </a>
          <a
            href="/history"
            className={`px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition ${
              activePage === "history" ? "border-l-4 border-blue-500" : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              setActivePage("history");
            }}
          >
            History
          </a>
        </nav>
      </SidePanel>
      <main
        className={`flex-1 p-4 transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-64"
        }`}
      >
        {renderPage()}
      </main>
    </div>
  );
}