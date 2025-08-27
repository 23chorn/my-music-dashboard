import FilterControls from "./forms/FilterControls";
import ListTile from "./ListTile";
import GridTile from "./tiles/GridTile";
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
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