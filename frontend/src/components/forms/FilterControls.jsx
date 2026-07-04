import LimitDropdown from "../controls/LimitDropdown";
import PeriodDropdown from "../controls/PeriodDropdown";
import ControlStrip from "../controls/ControlStrip";

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

  // Optional trailing action (e.g. "Create Playlist"), rendered as a strip segment
  actionButton = null,

  // Layout
  className = ""
}) {
  if (!showPeriod && !showLimit && !actionButton) return null;

  return (
    <ControlStrip className={className}>
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
      {actionButton}
    </ControlStrip>
  );
}
