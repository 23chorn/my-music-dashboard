import { useEffect, useState } from "react";
import { getArtistDailyPlays } from "../data/artistApi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function CustomHeatmap({ artistId, days = 90, defaultOpen = true }) {
  const [dailyPlays, setDailyPlays] = useState([]);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    async function fetchPlays() {
      try {
        const plays = await getArtistDailyPlays(artistId, days);
        setDailyPlays(plays);
      } catch {
        setDailyPlays([]);
      }
    }
    fetchPlays();
  }, [artistId, days]);

  // Create a map of dates to counts for quick lookup
  const playsMap = dailyPlays.reduce((acc, play) => {
    acc[play.day] = play.count;
    return acc;
  }, {});

  const getColorClass = (count) => {
    if (!count || count === 0) return "bg-gray-700";
    if (count < 2) return "bg-red-200";
    if (count < 5) return "bg-red-400";
    if (count < 10) return "bg-red-600";
    return "bg-red-800";
  };

  // Generate GitHub-style grid (columns = weeks, rows = days of week)
  const generateGitHubStyleGrid = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 88); // 90 days back (including today = 90 total days)
    
    // Find the most recent Sunday to start the grid
    const endSunday = new Date(today);
    endSunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
    
    // Find the Sunday that covers our 90-day range
    const startSunday = new Date(startDate);
    startSunday.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks = [];
    const monthLabels = [];
    let currentDate = new Date(startSunday);
    
    // Generate weeks
    while (currentDate <= endSunday) {
      const week = [];
      const weekStart = new Date(currentDate);
      
      // Check if this is the first week of a month for labeling
      const isFirstWeekOfMonth = currentDate.getDate() <= 7;
      if (isFirstWeekOfMonth) {
        monthLabels.push({
          week: weeks.length,
          label: currentDate.toLocaleDateString('en-US', { month: 'short' })
        });
      }
      
      // Generate 7 days for this week (Sunday = 0, Saturday = 6)
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = playsMap[dateStr] || 0;
        const isInRange = currentDate >= startDate && currentDate <= today;
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        week.push({
          date: dateStr,
          count: isInRange ? count : null,
          dayOfWeek: dayOfWeek
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return { weeks, monthLabels };
  };

  const { weeks, monthLabels } = generateGitHubStyleGrid();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-semibold text-blue-400">
          Heatmap of Plays
        </h2>
        <button
          className="p-0.5 hover:bg-gray-800 hover:bg-opacity-50 rounded transition ml-2 text-gray-400 hover:text-gray-300"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Collapse section" : "Expand section"}
        >
          {open ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className="bg-gray-900 rounded-lg p-4 w-fit">
          <div className="space-y-3">
            {/* Explanation */}
            <div className="text-sm text-gray-300">
              <p>Last 3 months of listening activity</p>
            </div>
            
            {/* Month labels */}
            <div className="flex relative h-4 ml-10">
              {monthLabels.map((month, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-400 absolute"
                  style={{ left: `${month.week * 14}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>
            
            {/* Day labels and heatmap */}
            <div className="flex">
              <div className="flex flex-col text-xs text-gray-400 mr-2 gap-0.5">
                <div className="h-3"></div>
                <div className="h-3 flex items-center">Mon</div>
                <div className="h-3"></div>
                <div className="h-3 flex items-center">Wed</div>
                <div className="h-3"></div>
                <div className="h-3 flex items-center">Fri</div>
                <div className="h-3"></div>
              </div>
              
              {/* GitHub-style heatmap grid */}
              <div className="flex gap-0.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3 h-3 rounded-sm ${
                          day.count !== null ? getColorClass(day.count) : 'bg-transparent'
                        }`}
                        title={day.count !== null ? `${day.date}: ${day.count} plays` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Color legend below */}
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-700"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-red-200"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-red-600"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-red-800"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}