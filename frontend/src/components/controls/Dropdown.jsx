import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";
import WheelPicker from "./WheelPicker";

export default function Dropdown({ value, onChange, options, label, className = "", variant = "default", align = "right", inlineLabel = false }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [pendingValue, setPendingValue] = useState(value);
  const ref = useRef(null);
  // The mobile picker sheet is portaled to document.body, so in the real DOM
  // it's a sibling of `ref`, not a descendant — the outside-click check below
  // needs this second ref or it treats every tap inside the sheet (including
  // "Done") as an outside click and closes before the tap's onClick can commit.
  const portalRef = useRef(null);
  const pickerRef = useRef(null);
  const wasOpenRef = useRef(open);

  // Reset pendingValue synchronously during render (not in the effect below) so that
  // when WheelPicker mounts for this open, it seeds its scroll position from the real
  // current value rather than a leftover value from a previous scroll-then-cancel.
  if (open !== wasOpenRef.current) {
    wasOpenRef.current = open;
    if (open) setPendingValue(value);
  }

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    const handlePointer = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (portalRef.current && portalRef.current.contains(e.target)) return;
      setOpen(false);
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
  }, [open]);

  const selected = options.find(opt => opt.value === value);

  // "inline" is used to embed a dropdown trigger directly in a section title
  // (e.g. "Top [10] Tracks") so it reads as part of the heading rather than a
  // separate control; stopPropagation keeps it from also toggling a
  // collapsible heading's open/closed state when the heading itself is clickable.
  const triggerClassName = variant === "inline"
    ? "inline-flex items-baseline gap-1 bg-transparent border border-surface-700 rounded px-1.5 py-0.5 font-display text-[1.2em] leading-none align-baseline uppercase tracking-widest text-brand-400 hover:text-brand-300 hover:border-brand-400/60 transition-colors focus:outline-none"
    : "flex items-center gap-1.5 h-full px-2.5 py-1.5 font-mono text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-400/60";

  // Prefer the wheel's live scroll position over pendingValue: on iOS the tap on
  // "Done" can land before the scroll events for the last bit of momentum have
  // been delivered, so pendingValue may still hold the previous selection.
  const commitPicker = () => {
    const picked = pickerRef.current?.getValue();
    onChange(picked === undefined ? pendingValue : picked);
  };

  const handleTriggerClick = (e) => {
    if (variant === "inline") e.stopPropagation();
    setOpen(o => !o);
  };

  return (
    <div ref={ref} className={`relative ${variant === "inline" ? "inline-block" : ""} ${className}`}>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClassName}
      >
        {label && variant !== "inline" && (
          <span className="text-surface-500 text-[10px] uppercase tracking-wide">{label}</span>
        )}
        {label && variant === "inline" && inlineLabel && (
          <span className="text-surface-500 normal-case tracking-normal no-underline">{label}</span>
        )}
        <span className="whitespace-nowrap">{selected?.label ?? value}</span>
        {variant !== "inline" && (
          <FaChevronDown size={7} className={`text-current opacity-60 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* Desktop: anchored popover list, unchanged */}
      {open && (
        <div
          role="listbox"
          className={`hidden sm:block absolute ${align === "left" ? "left-0" : "right-0"} z-20 mt-1 min-w-full max-h-64 overflow-y-auto bg-surface-800 border border-surface-700 rounded shadow-xl py-1`}
        >
          {options.map((opt, idx) => (
            <div key={opt.value}>
              {/* Optional group header — e.g. "Ratios & Rates (Line Charts)" —
                  shown once when this option's group differs from the one before it. */}
              {opt.group && opt.group !== options[idx - 1]?.group && (
                <div className={`px-3 pb-1 font-mono text-[10px] uppercase tracking-wide text-surface-500 ${idx === 0 ? 'pt-1' : 'pt-2 mt-1 border-t border-surface-700'}`}>
                  {opt.group}
                </div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors ${
                  opt.value === value
                    ? "text-brand-400 font-semibold bg-surface-700/60"
                    : "text-surface-300 hover:bg-surface-700 hover:text-surface-100"
                }`}
              >
                {opt.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mobile: scroll-wheel picker, portaled to body so it's never clipped or mispositioned by an ancestor */}
      {open && createPortal(
        // React bubbles portal events through the *component* tree, not the DOM
        // tree — so without this, a tap anywhere in this sheet (Done, a row, the
        // backdrop) also bubbles up into whatever ancestor click handler wraps
        // this dropdown in the real JSX tree (e.g. a collapsible section header),
        // firing that handler too.
        <div className="sm:hidden" ref={portalRef} onClick={(e) => e.stopPropagation()}>
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
                onClick={() => { commitPicker(); setOpen(false); }}
                className="font-mono text-sm font-semibold text-brand-400"
              >
                Done
              </button>
            </div>
            <WheelPicker ref={pickerRef} options={options} value={pendingValue} onChange={setPendingValue} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
