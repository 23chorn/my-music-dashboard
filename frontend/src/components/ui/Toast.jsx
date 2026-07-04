import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Toast({ message, type = "success", onDismiss, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return createPortal(
    <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-sm text-center text-sm font-medium px-4 py-3 rounded-lg shadow-2xl border bg-surface-800 ${
          type === "success" ? "border-success-700 text-success-400" : "border-danger-700 text-danger-400"
        }`}
      >
        {message}
      </div>
    </div>,
    document.body
  );
}
