import GroupedSection from "./GroupedSection";
import { getOrdinalSuffix } from "../utils/ordinalSuffix";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";

export default function MilestoneSection({ milestones }) {
  if (!milestones || milestones.length === 0) return null;

  const milestoneTiles = milestones.map(milestone => ({
    label: formatValue(`${milestone.milestone}${getOrdinalSuffix(milestone.milestone)} play:`),
    value: milestone.track,
    album: milestone.album,
    sub: formatDateTime(milestone.timestamp) || "N/A"
  }));

  return (
    <GroupedSection
      title="Milestones"
      items={milestoneTiles}
      showPeriod={false}
      showLimit={false}
      mapper={tile => tile}
      layout="list"
      collapsible={true}
    />
  );
}