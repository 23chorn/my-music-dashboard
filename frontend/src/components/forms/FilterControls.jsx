import LimitDropdown from "../LimitDropdown";
import PeriodDropdown from "../PeriodDropdown";

export default function FilterControls({
  // Period props
  showPeriod = false,
  period,
  setPeriod,
  periodOptions,
  
  // Limit props
  showLimit = false,
  limit,
  setLimit,
  limitOptions,
  
  // Layout
  className = ""
}) {
  if (!showPeriod && !showLimit) return null;

  return (
    <div className={`flex gap-3 items-start justify-end ${className}`}>
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
    </div>
  );
}