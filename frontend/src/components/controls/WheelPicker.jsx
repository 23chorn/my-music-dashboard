import { useState, useRef, useEffect } from "react";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const PADDING = (PICKER_HEIGHT - ROW_HEIGHT) / 2;
const SETTLE_DELAY = 120;

export default function WheelPicker({ options, value, onChange }) {
  const scrollRef = useRef(null);
  const settleTimeout = useRef(null);
  const [centerIndex, setCenterIndex] = useState(() => {
    const idx = options.findIndex(opt => opt.value === value);
    return idx === -1 ? 0 : idx;
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = centerIndex * ROW_HEIGHT;
    // Only run once, on mount, to seed the scroll position from the current value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(settleTimeout.current), []);

  const clampIndex = (idx) => Math.min(options.length - 1, Math.max(0, idx));

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = clampIndex(Math.round(el.scrollTop / ROW_HEIGHT));
    setCenterIndex(idx);

    clearTimeout(settleTimeout.current);
    settleTimeout.current = setTimeout(() => {
      const settled = clampIndex(Math.round(el.scrollTop / ROW_HEIGHT));
      el.scrollTo({ top: settled * ROW_HEIGHT, behavior: "smooth" });
      const opt = options[settled];
      if (opt && opt.value !== value) onChange(opt.value);
    }, SETTLE_DELAY);
  };

  const selectRow = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    clearTimeout(settleTimeout.current);
    el.scrollTo({ top: idx * ROW_HEIGHT, behavior: "smooth" });
    setCenterIndex(idx);
    const opt = options[idx];
    if (opt) onChange(opt.value);
  };

  return (
    <div className="relative" style={{ height: PICKER_HEIGHT }}>
      {/* Fade masks above/below the selection band */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-full bg-gradient-to-b from-surface-800 via-transparent to-surface-800" />
      {/* Selection band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 z-10 rounded-lg bg-surface-700/60 border border-surface-600"
        style={{ top: PADDING, height: ROW_HEIGHT }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div style={{ height: PADDING }} />
        {options.map((opt, idx) => {
          const distance = Math.abs(idx - centerIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25;
          const scale = distance === 0 ? 1 : 0.92;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => selectRow(idx)}
              className="flex items-center justify-center w-full font-mono text-base text-surface-100 transition-[opacity,transform] duration-150"
              style={{ height: ROW_HEIGHT, scrollSnapAlign: "center", opacity, transform: `scale(${scale})` }}
            >
              {opt.label}
            </button>
          );
        })}
        <div style={{ height: PADDING }} />
      </div>
    </div>
  );
}
