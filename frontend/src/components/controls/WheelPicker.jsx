import { useState, useRef, useEffect } from "react";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const PADDING = (PICKER_HEIGHT - ROW_HEIGHT) / 2;
const SETTLE_DELAY = 120;

export default function WheelPicker({ options, value, onChange }) {
  const scrollRef = useRef(null);
  const settleTimeout = useRef(null);
  // Touch/trackpad scrolling works natively via overflow-y-auto, but a plain
  // scroll div doesn't support click-and-drag with a mouse — desktop users
  // (e.g. testing in a resized browser window rather than a real touch
  // device) would find the wheel completely unresponsive without this.
  const dragState = useRef(null); // { startY, startScrollTop } while the pointer is down
  // Set true if a mouse drag actually moved the wheel; stays true past pointerup
  // so the row-click handler that follows can tell a drag apart from a tap.
  const justDraggedRef = useRef(false);
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

    // Report the value as soon as it's known, not after the settle delay below —
    // otherwise a "Done" tap right after the finger lifts can land before this
    // fires and commit the previous value instead of the one just scrolled to.
    const opt = options[idx];
    if (opt && opt.value !== value) onChange(opt.value);

    clearTimeout(settleTimeout.current);
    settleTimeout.current = setTimeout(() => {
      const settled = clampIndex(Math.round(el.scrollTop / ROW_HEIGHT));
      el.scrollTo({ top: settled * ROW_HEIGHT, behavior: "smooth" });
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

  const handlePointerDown = (e) => {
    // Touch/pen already scroll natively; only mouse needs manual drag support.
    if (e.pointerType === "touch") return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const drag = dragState.current;
    const el = scrollRef.current;
    if (!drag || !el) return;
    const delta = e.clientY - drag.startY;
    if (Math.abs(delta) > 3) justDraggedRef.current = true;
    el.scrollTop = drag.startScrollTop - delta;
    // Update immediately rather than waiting on the browser's own (async) scroll
    // event for this programmatic scrollTop change.
    handleScroll();
  };

  const endDrag = (e) => {
    const drag = dragState.current;
    if (!drag) return;
    dragState.current = null;
    const el = scrollRef.current;
    if (el && el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  // Suppress the row's onClick firing a jump to the wrong row right after a
  // mouse drag ends (the mouseup naturally lands over whatever row is under
  // the cursor, not necessarily the one the drag was aiming for).
  const handleRowClick = (idx) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    selectRow(idx);
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="h-full overflow-y-auto cursor-grab active:cursor-grabbing select-none"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
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
              onClick={() => handleRowClick(idx)}
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
