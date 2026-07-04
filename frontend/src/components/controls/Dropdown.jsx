import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import WheelPicker from "./WheelPicker";

export default function Dropdown({ value, onChange, options, label, className = "" }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [pendingValue, setPendingValue] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    setPendingValue(value);
    const id = requestAnimationFrame(() => setEntered(true));
    const handlePointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
    // Only re-seed pendingValue when the sheet opens, not on every value change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = options.find(opt => opt.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-full px-2.5 py-1.5 font-mono text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-400/60"
      >
        {label && (
          <span className="text-surface-500 text-[10px] uppercase tracking-wide">{label}</span>
        )}
        <span className="whitespace-nowrap">{selected?.label ?? value}</span>
        <FaChevronDown size={7} className={`text-surface-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Desktop: anchored popover list, unchanged */}
      {open && (
        <div
          role="listbox"
          className="hidden sm:block absolute right-0 z-20 mt-1 min-w-full max-h-64 overflow-y-auto bg-surface-800 border border-surface-700 rounded shadow-xl py-1"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors ${
                opt.value === value
                  ? "text-brand-400 font-semibold bg-surface-700/60"
                  : "text-surface-300 hover:bg-surface-700 hover:text-surface-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: scroll-wheel picker, portaled to body so it's never clipped or mispositioned by an ancestor */}
      {open && createPortal(
        <div className="sm:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 bg-surface-800 border-t border-surface-700 rounded-t-xl shadow-2xl transition-transform duration-200 ease-out ${entered ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
              <span className="text-surface-500 text-xs uppercase tracking-wide">{label || "Select"}</span>
              <button
                type="button"
                onClick={() => { onChange(pendingValue); setOpen(false); }}
                className="font-mono text-sm font-semibold text-brand-400"
              >
                Done
              </button>
            </div>
            <WheelPicker options={options} value={pendingValue} onChange={setPendingValue} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
