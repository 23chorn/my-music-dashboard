import GroupedSection from "./GroupedSection";
import { getOrdinalSuffix } from "../utils/ordinalSuffix";

export default function MilestoneSection({ milestones }) {
  if (!milestones || milestones.length === 0) return null;

  const milestoneTiles = milestones.map(milestone => ({
    label: `${milestone.milestone}${getOrdinalSuffix(milestone.milestone)} play:`,
    value: milestone.track,
    album: milestone.album,
    sub: milestone.timestamp
      ? new Date(milestone.timestamp * 1000).toLocaleString()
      : "N/A"
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