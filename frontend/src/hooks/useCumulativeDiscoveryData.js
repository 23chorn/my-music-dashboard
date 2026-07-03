import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function useCumulativeDiscoveryData(days = 365) {
  const [cumulativeData, setCumulativeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCumulativeDiscoveryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/trends/cumulative-discovery?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCumulativeData(data);
    } catch (err) {
      console.error('Failed to fetch cumulative discovery data:', err);
      setError(err.message);
      setCumulativeData([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchCumulativeDiscoveryData();
  }, [fetchCumulativeDiscoveryData]);

  const updatePeriod = useCallback(() => {
    // This will be handled by the parent component changing the days prop
    // which will trigger a re-fetch via the useEffect dependency
  }, []);

  const refresh = useCallback(() => {
    fetchCumulativeDiscoveryData();
  }, [fetchCumulativeDiscoveryData]);

  return {
    cumulativeData,
    loading,
    error,
    updatePeriod,
    refresh
  };
}