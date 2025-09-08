const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get unique counts and statistics
export async function getUniqueCountsFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/analytics/unique-counts`);
  if (!res.ok) throw new Error('Failed to fetch unique counts');
  return await res.json();
}

// Get timezone information
export async function getTimezoneInfoFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/system/timezone-info`);
  if (!res.ok) throw new Error('Failed to fetch timezone info');
  return await res.json();
}

// Get behavior analysis data
export async function getBehaviorAnalysisFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/analytics/behavior-analysis`);
  if (!res.ok) throw new Error('Failed to fetch behavior analysis');
  return await res.json();
}

// Get calculated metrics data
export async function getCalculatedMetricsFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/analytics/calculated-metrics`);
  if (!res.ok) throw new Error('Failed to fetch calculated metrics');
  return await res.json();
}

// Get discovery freshness data
export async function getDiscoveryFreshnessFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/analytics/discovery-freshness`);
  if (!res.ok) throw new Error('Failed to fetch discovery freshness');
  return await res.json();
}