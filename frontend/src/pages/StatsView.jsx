import PageLayout from "../components/layout/PageLayout";
import OverviewStats from "../components/stats/OverviewStats";
import ListeningTimeStats from "../components/stats/ListeningTimeStats";
import BehaviorAnalysis from "../components/stats/BehaviorAnalysis";
import CalculatedMetrics from "../components/stats/CalculatedMetrics";
import DiscoveryFreshness from "../components/stats/DiscoveryFreshness";
import MilestoneAchievements from "../components/stats/MilestoneAchievements";
import TrendsChart from "../components/trends/TrendsChart";
import CumulativeDiscoveryChart from "../components/trends/CumulativeDiscoveryChart";
import useStatsData from "../hooks/useStatsData";

export default function StatsView() {
  const { statsData, behaviorData, calculatedMetrics, discoveryData, loading, error } = useStatsData();

  return (
    <PageLayout
      title="Statistics"
      subheader="Your music listening patterns, trends, and discovery insights"
      loading={loading}
      error={error ? `Error loading stats: ${error}` : null}
    >
      <div className="space-y-8">
        <OverviewStats statsData={statsData} />
        <ListeningTimeStats behaviorData={behaviorData} statsData={statsData} />
        <BehaviorAnalysis behaviorData={behaviorData} />
        <MilestoneAchievements />
        <DiscoveryFreshness discoveryData={discoveryData} />
        <CalculatedMetrics calculatedMetrics={calculatedMetrics} />
        <TrendsChart />
        <CumulativeDiscoveryChart />
      </div>
    </PageLayout>
  );
}