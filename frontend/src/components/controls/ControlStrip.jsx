import { Children } from "react";

export default function ControlStrip({ children, className = "" }) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className={`flex items-stretch bg-surface-800/60 border border-surface-700 rounded-sm divide-x divide-surface-700 ${className}`}>
      {items}
    </div>
  );
}
