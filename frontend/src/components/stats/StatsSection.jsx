import GroupedSection from "../GroupedSection";
import { createStatsSection } from "../../utils/statsFormatter";

export default function StatsSection({ stats, type = 'artist', title = 'Stats' }) {
  const statsTiles = createStatsSection(stats, type);
  
  return (
    <GroupedSection
      title={title}
      items={statsTiles.length > 0 ? statsTiles : [{ label: "No stats available", value: "" }]}
      showPeriod={false}
      showLimit={false}
      mapper={tile => tile}
      layout="grid"
    />
  );
}