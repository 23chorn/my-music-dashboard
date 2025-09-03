import { useState, useEffect } from "react";
import { trackService } from "../data/trackService";
import { formatValue } from "../utils/numberFormat";
import { DEFAULT_LIMITS } from "../config/appConfig";

export default function useTrackViewData(trackId) {
  const [track, setTrack] = useState(null);
  const [recentPlays, setRecentPlays] = useState([]);
  const [stats, setStats] = useState(null);
  const [dailyPlays, setDailyPlays] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  
  const [recentLimit, setRecentLimit] = useState(DEFAULT_LIMITS.trackView.recent);
  const [dailyPlaysDays, setDailyPlaysDays] = useState(DEFAULT_LIMITS.trackView.dailyPlaysDays);

  // Fetch track info
  useEffect(() => {
    if (!trackId) return;
    
    setLoading(true);
    trackService.getTrackInfo(trackId)
      .then(data => {
        setTrack(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch track info:", error);
        setLoading(false);
      });
  }, [trackId]);

  // Fetch recent plays
  useEffect(() => {
    if (!trackId) return;
    
    setRecentLoading(true);
    trackService.getTrackRecentPlays(trackId, recentLimit)
      .then(data => {
        setRecentPlays(data);
        setRecentLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch recent plays:", error);
        setRecentLoading(false);
      });
  }, [trackId, recentLimit]);

  // Fetch stats
  useEffect(() => {
    if (!trackId) return;
    
    setStatsLoading(true);
    trackService.getTrackStats(trackId)
      .then(data => {
        setStats(data);
        setStatsLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch stats:", error);
        setStatsLoading(false);
      });
  }, [trackId]);

  // Fetch daily plays for chart
  useEffect(() => {
    if (!trackId) return;
    
    trackService.getTrackDailyPlays(trackId, dailyPlaysDays)
      .then(data => {
        // Format for chart
        const formattedData = data.map(item => ({
          date: item.day,
          plays: parseInt(item.plays)
        }));
        setDailyPlays(formattedData);
      })
      .catch(error => {
        console.error("Failed to fetch daily plays:", error);
      });
  }, [trackId, dailyPlaysDays]);

  return {
    track,
    recentPlays,
    stats,
    dailyPlays,
    loading,
    recentLoading,
    statsLoading,
    recentLimit,
    setRecentLimit,
    dailyPlaysDays,
    setDailyPlaysDays
  };
}