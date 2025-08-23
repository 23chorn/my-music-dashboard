import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function CollapsibleSection({ children, defaultOpen = true, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`mb-8 ${className}`}>
      <div className="flex items-center mb-2">
        <button
          className="p-1 rounded bg-gray-900 hover:bg-gray-800 transition"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Collapse section" : "Expand section"}
        >
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>
      {open && <div>{children}</div>}
    </section>
  );
}