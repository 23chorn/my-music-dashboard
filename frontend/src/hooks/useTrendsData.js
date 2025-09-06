import { useState, useEffect, useCallback } from 'react';
import { trendsApi } from '../data/trendsApi';

export default function useTrendsData(initialPeriod = 90) {
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(initialPeriod);

  const fetchTrendsData = useCallback(async (days) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await trendsApi.getCombinedTrends(days);
      setTrendsData(data);
    } catch (err) {
      console.error('Error in useTrendsData:', err);
      setError(err.message || 'Failed to fetch trends data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when period changes
  useEffect(() => {
    fetchTrendsData(period);
  }, [period, fetchTrendsData]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    fetchTrendsData(period);
  }, [period, fetchTrendsData]);

  // Update period function
  const updatePeriod = useCallback((newPeriod) => {
    setPeriod(newPeriod);
  }, []);

  return {
    trendsData,
    loading,
    error,
    period,
    updatePeriod,
    refresh
  };
}