import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import OverviewStats from "../components/stats/OverviewStats";
import ListeningTimeStats from "../components/stats/ListeningTimeStats";
import BehaviorAnalysis from "../components/stats/BehaviorAnalysis";
import DataQuality from "../components/stats/DataQuality";
import SystemInfo from "../components/stats/SystemInfo";
import CalculatedMetrics from "../components/stats/CalculatedMetrics";
import useStatsData from "../hooks/useStatsData";

export default function StatsView() {
  const { statsData, timezoneInfo, behaviorData, calculatedMetrics, loading, error } = useStatsData();

  if (loading) {
    return (
      <PageLayout title="Statistics">
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Statistics">
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-2">⚠️ Error Loading Stats</div>
            <div className="text-gray-400">{error}</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Statistics">
      <div className="space-y-8">
        <OverviewStats statsData={statsData} />
        <ListeningTimeStats behaviorData={behaviorData} statsData={statsData} />
        <BehaviorAnalysis behaviorData={behaviorData} />
        <CalculatedMetrics calculatedMetrics={calculatedMetrics} />
        <DataQuality statsData={statsData} behaviorData={behaviorData} />
        <SystemInfo timezoneInfo={timezoneInfo} />
      </div>
    </PageLayout>
  );
}