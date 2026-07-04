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
        className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors text-surface-300 hover:text-white"
        onClick={() => setMenuOpen(open => !open)}
        aria-label="Open menu"
      >
        <FaBars size={20} />
      </button>
      {menuOpen && (
        <div
          ref={dropdownRef}
          className="menu-dropdown mt-2 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-2 w-56 absolute top-10 left-0 z-50"
        >
          {/* Browse Section */}
          <div className="border-b border-surface-700">
            <button
              className="flex items-center justify-between w-full px-4 py-2 font-display text-xs uppercase tracking-widest text-surface-500 hover:text-surface-300 transition-colors"
              onClick={() => toggleSection('browse')}
            >
              <span>Browse</span>
              {expandedSections.browse ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )}
            </button>
            {expandedSections.browse && (
              <div className="pb-1">
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
                  onClick={() => handleNavigate("/")}
                >
                  Dashboard
                </button>
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
                  onClick={() => handleNavigate("/explore")}
                >
                  Explore
                </button>
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
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
              className="flex items-center justify-between w-full px-4 py-2 font-display text-xs uppercase tracking-widest text-surface-500 hover:text-surface-300 transition-colors"
              onClick={() => toggleSection('aiAnalysis')}
            >
              <span>AI & Analysis</span>
              {expandedSections.aiAnalysis ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )}
            </button>
            {expandedSections.aiAnalysis && (
              <div className="pb-1">
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
                  onClick={() => handleNavigate("/ai-insights")}
                >
                  AI Insights
                </button>
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
                  onClick={() => handleNavigate("/chat")}
                >
                  AI Chat
                </button>
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
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
              className="flex items-center justify-between w-full px-4 py-2 font-display text-xs uppercase tracking-widest text-surface-500 hover:text-surface-300 transition-colors"
              onClick={() => toggleSection('tools')}
            >
              <span>Tools</span>
              {expandedSections.tools ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )}
            </button>
            {expandedSections.tools && (
              <div className="pb-1">
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
                  onClick={() => handleNavigate("/tags")}
                >
                  Tags
                </button>
                <button
                  className="block w-full text-left px-6 py-2 text-sm text-surface-200 hover:bg-surface-700/50 hover:text-brand-300 transition-colors"
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