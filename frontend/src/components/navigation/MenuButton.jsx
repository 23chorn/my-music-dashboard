import { useState, useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export default function MenuButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    browse: true,
    aiAnalysis: false,
    tools: false
  });
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <div>
      <button
        ref={buttonRef}
        className="p-2 rounded bg-surface-900 hover:bg-surface-800 shadow text-white"
        onClick={() => setMenuOpen(open => !open)}
        aria-label="Open menu"
      >
        <FaBars size={24} />
      </button>
      {menuOpen && (
        <div
          ref={dropdownRef}
          className="menu-dropdown mt-2 bg-surface-900 border border-surface-700 rounded shadow-lg py-2 w-56 absolute top-10 left-0 z-50"
        >
          {/* Browse Section */}
          <div className="border-b border-surface-700">
            <button
              className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-surface-400 hover:bg-surface-800"
              onClick={() => toggleSection('browse')}
            >
              <span>Browse</span>
              {expandedSections.browse ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            {expandedSections.browse && (
              <div className="pb-1">
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/")}
                >
                  Dashboard
                </button>
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/explore")}
                >
                  Explore
                </button>
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/stats")}
                >
                  Stats
                </button>
              </div>
            )}
          </div>

          {/* AI & Analysis Section */}
          <div className="border-b border-surface-700">
            <button
              className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-surface-400 hover:bg-surface-800"
              onClick={() => toggleSection('aiAnalysis')}
            >
              <span>AI & Analysis</span>
              {expandedSections.aiAnalysis ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            {expandedSections.aiAnalysis && (
              <div className="pb-1">
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/ai-insights")}
                >
                  AI Insights
                </button>
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/chat")}
                >
                  AI Chat
                </button>
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/insights")}
                >
                  System Insights
                </button>
              </div>
            )}
          </div>

          {/* Tools Section */}
          <div>
            <button
              className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-surface-400 hover:bg-surface-800"
              onClick={() => toggleSection('tools')}
            >
              <span>Tools</span>
              {expandedSections.tools ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            {expandedSections.tools && (
              <div className="pb-1">
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/tags")}
                >
                  Tags
                </button>
                <button
                  className="block w-full text-left px-6 py-2 hover:bg-brand-900 text-brand-300 text-sm"
                  onClick={() => handleNavigate("/trivia")}
                >
                  Trivia
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}