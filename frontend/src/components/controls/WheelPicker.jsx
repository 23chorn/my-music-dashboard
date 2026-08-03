import { useState, useRef, useEffect, useImperativeHandle } from "react";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const PADDING = (PICKER_HEIGHT - ROW_HEIGHT) / 2;

export default function WheelPicker({ options, value, onChange, ref }) {
  const scrollRef = useRef(null);
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

  const clampIndex = (idx) => Math.min(options.length - 1, Math.max(0, idx));

  const indexFromScroll = () => {
    const el = scrollRef.current;
    if (!el) return clampIndex(centerIndex);
    return clampIndex(Math.round(el.scrollTop / ROW_HEIGHT));
  };

  // "Done" reads the live scroll position through this rather than trusting the
  // last onChange it happened to receive. On iOS the scroll event stream can
  // still be mid-flight (or land out of order) when the tap fires, so the
  // scroll position is the only trustworthy source of what the user picked.
  useImperativeHandle(ref, () => ({
    getValue: () => options[indexFromScroll()]?.value,
  }));

  const handleScroll = () => {
    const idx = indexFromScroll();
    setCenterIndex(idx);
    const opt = options[idx];
    if (opt && opt.value !== value) onChange(opt.value);
  };

  const selectRow = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
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
    if (!el) return;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // CSS scroll-snap only engages after a real user scroll gesture, so a mouse
    // drag (which moves scrollTop programmatically) has to be snapped by hand.
    // Touch and wheel scrolling are left entirely to the browser — racing them
    // with our own smooth scroll is what made this unreliable on iOS.
    el.scrollTo({ top: indexFromScroll() * ROW_HEIGHT, behavior: "smooth" });
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
              onClick={() => handleRowClick(idx)}
              className="flex items-center justify-center w-full font-mono text-base text-surface-100 transition-opacity duration-150"
              style={{ height: ROW_HEIGHT, scrollSnapAlign: "center", opacity }}
            >
              {/* The scale lives on this inner span, never on the button. A snap
                  target's snap area is its *transformed* border box, so scaling
                  the button itself re-sized every snap area on every scroll event
                  — WebKit responds by re-snapping mid-gesture and dragging the
                  wheel back to the row it started on. */}
              <span
                className="block transition-transform duration-150"
                style={{ transform: `scale(${scale})` }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
        <div style={{ height: PADDING }} />
      </div>
    </div>
  );
}
