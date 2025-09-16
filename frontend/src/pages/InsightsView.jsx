import { useEffect, useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import SystemInfo from "../components/stats/SystemInfo";
import DatabaseHealth from "../components/insights/DatabaseHealth";
import SyncStatus from "../components/insights/SyncStatus";
import ExternalIdCoverage from "../components/insights/ExternalIdCoverage";
import DuplicateTracking from "../components/insights/DuplicateTracking";
import MetadataCompletion from "../components/insights/MetadataCompletion";
import useStatsData from "../hooks/useStatsData";
import { getInsightsData } from "../data/insightsApi";

export default function InsightsView() {
  const { timezoneInfo, loading: statsLoading, error: statsError } = useStatsData();
  const [insightsData, setInsightsData] = useState({});
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    async function fetchInsightsData() {
      try {
        setInsightsLoading(true);
        const data = await getInsightsData();
        setInsightsData(data);
        setInsightsError(null);
      } catch (err) {
        console.error("Failed to fetch insights data:", err);
        setInsightsError(err.message);
      } finally {
        setInsightsLoading(false);
      }
    }

    fetchInsightsData();
  }, []);

  const loading = statsLoading || insightsLoading;
  const error = statsError || insightsError;

  return (
    <PageLayout
      title="Data Insights"
      subheader="Database quality, system health, and data integrity tracking"
      loading={loading}
      error={error ? `⚠️ Error Loading Data: ${error}` : null}
    >
      <div className="space-y-8">
        {/* Data Quality Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ExternalIdCoverage data={insightsData.externalIdCoverage} />
          <MetadataCompletion data={insightsData.metadataCompletion} />
        </div>

        {/* Database Health & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DatabaseHealth data={insightsData.databaseHealth} />
          <SyncStatus data={insightsData.syncStatus} />
        </div>

        {/* Data Management */}
        <DuplicateTracking data={insightsData.duplicateTracking} />

        {/* System Information */}
        <SystemInfo timezoneInfo={timezoneInfo} />
      </div>
    </PageLayout>
  );
}