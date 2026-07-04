import FilterControls from "../forms/FilterControls";
import ListTile from "../tiles/ListTile";
import GridTile from "../tiles/GridTile";
import LimitDropdown from "../controls/LimitDropdown";
import PeriodDropdown from "../controls/PeriodDropdown";
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
  actionButton = null, // Optional action button component, kept clear of the title row
  titleExtra = null, // Optional inline control (e.g. a sort dropdown) appended into the title row
}) {
  const [open, setOpen] = useState(defaultOpen);

  const mappedItems = Array.isArray(items)
    ? items.slice(0, limit).map(mapper)
    : [];

  // "Top Artists" + a selected limit/period reads better as "Top 10 Artists ·
  // Last 7 Days" (and "Recent Plays" as "Recent 10 Plays"), with the count
  // and period themselves as the dropdowns, than as a static label with
  // separate controls off to the side. Only titles that read naturally with
  // a number inserted after the leading word qualify.
  const dynamicMatch = showLimit && limit ? title.match(/^(Top|Recent)\s+(.*)$/i) : null;

  const titleNode = (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      {dynamicMatch ? (
        <>
          <span>{dynamicMatch[1]}</span>
          <LimitDropdown value={limit} onChange={setLimit} options={limitOptions} variant="inline" align="left" />
          <span>{dynamicMatch[2]}</span>
        </>
      ) : (
        <span>{title}</span>
      )}
      {dynamicMatch && showPeriod && (
        <>
          <span className="text-surface-600">&middot;</span>
          <PeriodDropdown value={period} onChange={setPeriod} options={periodOptions} variant="inline" align="left" />
        </>
      )}
      {titleExtra && (
        <>
          <span className="text-surface-600">&middot;</span>
          {titleExtra}
        </>
      )}
    </span>
  );

  // Once limit/period live in the title itself, the separate control strip
  // only needs to carry any leftover action button (e.g. "Create Playlist").
  const controls = (
    <FilterControls
      showPeriod={!dynamicMatch && showPeriod}
      period={period}
      setPeriod={setPeriod}
      periodOptions={periodOptions}
      showLimit={!dynamicMatch && showLimit}
      limit={limit}
      setLimit={setLimit}
      limitOptions={limitOptions}
      actionButton={actionButton}
    />
  );

  // The whole title row toggles the section — title, divider and chevron all
  // respond together on hover so it reads as one control, not a text label
  // with an incidental button stuck on the end. Inline dropdowns inside the
  // title stop click propagation so opening one never also collapses the section.
  const content = (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-3 gap-2">
        <div
          className={`group flex items-center gap-3 w-full sm:flex-1 justify-center sm:justify-start min-w-0 ${collapsible ? 'cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60' : ''}`}
          onClick={collapsible ? () => setOpen(o => !o) : undefined}
          {...(collapsible ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": open,
            "aria-label": `${open ? "Collapse" : "Expand"} ${typeof title === "string" ? title : "section"}`,
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(o => !o);
              }
            }
          } : {})}
        >
          <h2
            className={`font-display text-base sm:text-lg uppercase tracking-widest text-brand-400 ${dynamicMatch || titleExtra ? '' : 'whitespace-nowrap'} ${collapsible ? 'group-hover:text-brand-300 transition-colors' : ''}`}
          >
            {titleNode}
          </h2>
          <span className={`hidden sm:block flex-1 h-px bg-surface-700 min-w-8 ${collapsible ? 'transition-colors group-hover:bg-surface-600' : ''}`} />
          {!dynamicMatch && !titleExtra && (
            <span className="hidden sm:inline font-mono text-xs text-surface-500 whitespace-nowrap">
              {mappedItems.length}
            </span>
          )}
          {collapsible && (
            <FaChevronDown
              size={10}
              className={`shrink-0 text-surface-500 transition-[transform,color] duration-200 group-hover:text-brand-300 ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          )}
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
