import FilterControls from "../forms/FilterControls";
import ListTile from "../tiles/ListTile";
import GridTile from "../tiles/GridTile";
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
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
      className="p-0.5 hover:bg-gray-800 hover:bg-opacity-50 rounded transition ml-2 text-gray-400 hover:text-gray-300"
      onClick={() => setOpen(o => !o)}
      aria-label={open ? "Collapse section" : "Expand section"}
    >
      {open ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
    </button>
  );

  const controls = (
    <div className="flex items-center gap-2">
      <FilterControls
        showPeriod={showPeriod}
        period={period}
        setPeriod={setPeriod}
        periodOptions={periodOptions}
        showLimit={showLimit}
        limit={limit}
        setLimit={setLimit}
        limitOptions={limitOptions}
      />
      {actionButton}
    </div>
  );

  const content = (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
          <h2 
            className={`text-lg sm:text-2xl font-semibold text-blue-400 text-center ${collapsible ? 'cursor-pointer hover:text-blue-300 transition-colors' : ''}`}
            onClick={collapsible ? () => setOpen(o => !o) : undefined}
          >
            {title}
          </h2>
          {collapseButton}
        </div>
        {controls}
      </div>
      {open && (
        layout === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {mappedItems.map((item, idx) => (
              <GridTile key={idx} {...item} />
            ))}
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {mappedItems.map((item, idx) => (
              <ListTile key={idx} {...item} />
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