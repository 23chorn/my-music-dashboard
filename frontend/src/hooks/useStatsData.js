import { useEffect, useState } from "react";
import { getUniqueCountsFromServer, getTimezoneInfoFromServer, getBehaviorAnalysisFromServer, getCalculatedMetricsFromServer, getDiscoveryFreshnessFromServer } from "../data/statsApi";

export default function useStatsData() {
  const [statsData, setStatsData] = useState({});
  const [timezoneInfo, setTimezoneInfo] = useState({});
  const [behaviorData, setBehaviorData] = useState({});
  const [calculatedMetrics, setCalculatedMetrics] = useState({});
  const [discoveryData, setDiscoveryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all stats data in parallel
      const [uniqueCounts, timezone, behavior, calculated, discovery] = await Promise.all([
        getUniqueCountsFromServer(),
        getTimezoneInfoFromServer(),
        getBehaviorAnalysisFromServer(),
        getCalculatedMetricsFromServer(),
        getDiscoveryFreshnessFromServer()
      ]);

      setStatsData(uniqueCounts);
      setTimezoneInfo(timezone);
      setBehaviorData(behavior);
      setCalculatedMetrics(calculated);
      setDiscoveryData(discovery);
    } catch (error) {
      console.error('Failed to fetch stats data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsData();
  }, []);

  return {
    statsData,
    timezoneInfo,
    behaviorData,
    calculatedMetrics,
    discoveryData,
    loading,
    error,
    refetch: fetchStatsData
  };
}