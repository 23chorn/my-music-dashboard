import CollapsibleSection from "./CollapsibleSection";
import LimitDropdown from "./LimitDropdown";
import PeriodDropdown from "./PeriodDropdown";
import ListTile from "./ListTile";
import Tile from "./Tile";
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function GroupedSection({
  title,
  items,
  limit,
  setLimit,
  showLimit = false,
  limitOptions = [5, 10, 15, 20, 25, 30, 40, 50],
  period,
  setPeriod,
  showPeriod = false,
  periodOptions = [
    { value: "overall", label: "All Time" },
    { value: "7day", label: "Last 7 Days" },
    { value: "1month", label: "Last Month" },
    { value: "3month", label: "Last 3 Months" },
    { value: "6month", label: "Last 6 Months" },
    { value: "12month", label: "Last 12 Months" },
  ],
  mapper,
  Renderer = ListTile,
  layout = "list", // "list" or "grid"
  collapsible = false,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const mappedItems = Array.isArray(items)
    ? items.slice(0, limit).map(mapper)
    : [];

  // Separate collapse button so it stays next to the title
  const collapseButton = collapsible && (
    <button
      className="p-1 rounded bg-gray-900 hover:bg-gray-800 transition ml-2"
      onClick={() => setOpen(o => !o)}
      aria-label={open ? "Collapse section" : "Expand section"}
    >
      {open ? <FaChevronUp /> : <FaChevronDown />}
    </button>
  );

  const controls = (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 items-center justify-end">
      {showPeriod && (
        <PeriodDropdown
          value={period ?? "overall"}
          onChange={setPeriod}
          options={periodOptions}
        />
      )}
      {showLimit && (
        <LimitDropdown
          value={limit}
          onChange={setLimit}
          options={limitOptions}
        />
      )}
      {/* Remove collapse button from here */}
    </div>
  );

  const content = (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
          <h2 className="text-lg sm:text-2xl font-semibold text-blue-400 text-center">{title}</h2>
          {collapseButton}
        </div>
        {controls}
      </div>
      {open && (
        layout === "grid" ? (
          <Tile tiles={mappedItems} />
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {mappedItems.map((item, idx) => (
              <Renderer key={idx} {...item} />
            ))}
          </ul>
        )
      )}
    </>
  );

  return (
    <section className="mb-4 px-2 sm:px-4">{content}</section>
  );
}