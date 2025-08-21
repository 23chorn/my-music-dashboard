import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function CollapsibleSection({ title, children, defaultOpen = true, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`mb-8 ${className}`}>
      <button
        className="flex items-center text-xl font-bold mb-2 bg-gray-900 px-4 py-2 rounded w-full justify-between min-w-0"
        onClick={() => setOpen(o => !o)}
      >
        <span>{title}</span>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}