import { formatValue } from "./numberFormat";
import { formatDate, formatDayDate, formatMonthYear } from "./dateFormatter";

export function createStatsSection(stats, type = 'artist') {
  if (!stats) return [];

  const baseTiles = [
    {
      label: "Total Streams",
      value: formatValue(stats.total_streams),
    },
    {
      label: "First Streamed",
      value: formatDate(stats.first_play),
    },
    {
      label: "Most Recent Stream",
      value: formatDate(stats.last_play),
    },
    {
      label: "Top Day",
      value: formatDayDate(stats.top_day?.day),
      sub: stats.top_day?.count ? formatValue(`${stats.top_day.count} plays`) : "",
    },
  ];

  // Add type-specific tiles
  if (type === 'artist') {
    baseTiles.push(
      {
        label: "Top Month",
        value: formatMonthYear(stats.top_month?.month),
        sub: stats.top_month?.count ? formatValue(`${stats.top_month.count} plays`) : "",
      },
      {
        label: "Top Year",
        value: stats.top_year?.year || "N/A",
        sub: stats.top_year?.count ? formatValue(`${stats.top_year.count} plays`) : "",
      },
      {
        label: "Longest Listening Streak",
        value: formatValue(
          stats.longest_streak ? `${stats.longest_streak} days` : "N/A"
        ),
      },
      {
        label: "% of Total Listening",
        value:
          stats.percent_of_total !== null && stats.percent_of_total !== undefined
            ? `${stats.percent_of_total}%`
            : "N/A",
      },
      {
        label: "Rank Among All Artists",
        value: stats.rank
          ? formatValue(`#${stats.rank} of ${stats.total_artists}`)
          : "N/A",
      }
    );
  } else if (type === 'album') {
    baseTiles.push(
      {
        label: "Top Year",
        value: stats.top_year?.year || "N/A",
        sub: stats.top_year?.count ? formatValue(`${stats.top_year.count} plays`) : "",
      },
      {
        label: "Rank Among All Albums",
        value: stats.rank
          ? formatValue(`#${stats.rank} of ${stats.total_albums}`)
          : "N/A",
      }
    );
  }

  return baseTiles;
}