import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { getOrdinalSuffix } from "../../utils/ordinalSuffix";
import { formatValue } from "../../utils/numberFormat";
import { formatDateTime } from "../../utils/dateFormatter";

export default function MilestoneSection({ milestones }) {
  const [open, setOpen] = useState(true);

  if (!milestones || milestones.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h2
          className="font-display text-base uppercase tracking-widest text-brand-400 cursor-pointer hover:text-brand-300 transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          Milestones
        </h2>
        <button
          className="p-1 ml-1 text-surface-500 hover:text-surface-300 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Collapse section" : "Expand section"}
        >
          <FaChevronDown size={9} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="space-y-2">
          {milestones.map((m, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-surface-800 border border-surface-700 rounded p-3">
              <div className="shrink-0 w-14 h-14 rounded-full border-2 border-brand-400/50 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-sm text-brand-400 leading-none">
                  {formatValue(m.milestone)}
                </span>
                <span className="font-display text-[9px] uppercase tracking-wide text-surface-500 leading-none mt-0.5">
                  plays
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-brand-400/80 uppercase tracking-wide">
                  {m.milestone}{getOrdinalSuffix(m.milestone)} play
                </div>
                <div className="font-bold text-white truncate">{m.track}</div>
                {m.album && <div className="text-sm text-surface-400 truncate">{m.album}</div>}
              </div>
              <div className="font-mono text-xs text-surface-500 shrink-0">
                {formatDateTime(m.timestamp) || "N/A"}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}