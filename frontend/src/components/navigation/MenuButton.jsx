import { useState, useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function MenuButton() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div>
      <button
        ref={buttonRef}
        className="p-2 rounded bg-gray-900 hover:bg-gray-800 shadow text-white"
        onClick={() => setMenuOpen(open => !open)}
        aria-label="Open menu"
      >
        <FaBars size={24} />
      </button>
      {menuOpen && (
        <div
          ref={dropdownRef}
          className="menu-dropdown mt-2 bg-gray-900 border border-gray-700 rounded shadow-lg py-2 w-40 absolute top-10 left-0 z-50"
        >
          <button
            className="block w-full text-left px-4 py-2 hover:bg-blue-900 text-blue-300"
            onClick={() => { setMenuOpen(false); navigate("/"); }}
          >
            Dashboard
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-blue-900 text-blue-300"
            onClick={() => { setMenuOpen(false); navigate("/explore"); }}
          >
            Explore
          </button>
        </div>
      )}
    </div>
  );
}