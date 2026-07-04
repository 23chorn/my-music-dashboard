import FilterControls from "../forms/FilterControls";
import ListTile from "../tiles/ListTile";
import GridTile from "../tiles/GridTile";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { LIMIT_OPTIONS, PERIOD_OPTIONS } from "../../config/appConfig";

export default function GroupedSection({
  title,
  items,
  limit,
  setLimit,
  showLimit = false,
  limitOptions = LIMIT_OPTIONS,
  period,
  setPeriod,
  showPeriod = false,
  periodOptions = PERIOD_OPTIONS,
  mapper,
  layout = "list", // "list" or "grid"
  collapsible = false,
  defaultOpen = true,
  actionButton = null, // Optional action button component
}) {
  const [open, setOpen] = useState(defaultOpen);

  const mappedItems = Array.isArray(items)
    ? items.slice(0, limit).map(mapper)
    : [];

  // Separate collapse button so it stays next to the title
  const collapseButton = collapsible && (
    <button
      className="p-1 ml-1 text-surface-500 hover:text-surface-300 transition-colors"
      onClick={() => setOpen(o => !o)}
      aria-label={open ? "Collapse section" : "Expand section"}
    >
      <FaChevronDown size={9} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
    </button>
  );

  const controls = (
    <FilterControls
      showPeriod={showPeriod}
      period={period}
      setPeriod={setPeriod}
      periodOptions={periodOptions}
      showLimit={showLimit}
      limit={limit}
      setLimit={setLimit}
      limitOptions={limitOptions}
      actionButton={actionButton}
    />
  );

  const content = (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-3 w-full sm:flex-1 justify-center sm:justify-start min-w-0">
          <h2
            className={`font-display text-base sm:text-lg uppercase tracking-widest text-brand-400 whitespace-nowrap ${collapsible ? 'cursor-pointer hover:text-brand-300 transition-colors' : ''}`}
            onClick={collapsible ? () => setOpen(o => !o) : undefined}
          >
            {title}
          </h2>
          {collapseButton}
          <span className="hidden sm:block flex-1 h-px bg-surface-700 min-w-8" />
          <span className="hidden sm:inline font-mono text-xs text-surface-500 whitespace-nowrap">
            {mappedItems.length}
          </span>
        </div>
        {controls}
      </div>
      {open && (
        layout === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mappedItems.map((item, idx) => (
              <GridTile key={idx} rank={idx + 1} {...item} />
            ))}
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {mappedItems.map((item, idx) => (
              <ListTile key={idx} rank={idx + 1} {...item} />
            ))}
          </ul>
        )
      )}
    </>
  );

  return (
    <section className="mb-4">{content}</section>
  );
}