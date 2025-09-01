import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { getDailyPlaysFromServer } from "../data/dashboardApi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { HEATMAP_CONFIG } from "../config/appConfig";

const DashboardHeatmap = forwardRef(function DashboardHeatmap({ defaultOpen = true }, ref) {
  const [dailyPlays, setDailyPlays] = useState([]);
  const [open, setOpen] = useState(defaultOpen);
  const [screenSize, setScreenSize] = useState('large');

  useEffect(() => {
    const updateScreenSize = () => {
      if (window.innerWidth < 640) { // sm breakpoint
        setScreenSize('small');
      } else if (window.innerWidth < 1024) { // lg breakpoint
        setScreenSize('medium');
      } else {
        setScreenSize('large');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Get appropriate date range based on screen size
  const getDaysForScreen = () => {
    switch (screenSize) {
      case 'small': return HEATMAP_CONFIG.dashboard.small; // ~3 months
      case 'medium': return HEATMAP_CONFIG.dashboard.medium; // ~6 months  
      case 'large': return HEATMAP_CONFIG.dashboard.large; // 1 year
      default: return HEATMAP_CONFIG.dashboard.large;
    }
  };

  const days = getDaysForScreen();

  const fetchPlays = async () => {
    try {
      const plays = await getDailyPlaysFromServer(days);
      setDailyPlays(plays);
    } catch {
      setDailyPlays([]);
    }
  };

  useEffect(() => {
    fetchPlays();
  }, [days]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: fetchPlays
  }));

  // Create a map of dates to counts for quick lookup
  const playsMap = dailyPlays.reduce((acc, play) => {
    acc[play.day] = play.count;
    return acc;
  }, {});

  const getColorClass = (count) => {
    if (!count || count === 0) return "bg-gray-700";
    if (count <= 20) return "bg-red-200";
    if (count <= 40) return "bg-red-400";
    if (count <= 75) return "bg-red-600";
    return "bg-red-800";
  };

  // Generate GitHub-style grid (columns = weeks, rows = days of week)
  const generateGitHubStyleGrid = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1)); // Dynamic range based on screen size
    
    const endSunday = new Date(today);
    endSunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
    
    const startSunday = new Date(startDate);
    startSunday.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks = [];
    const monthLabels = [];
    let currentDate = new Date(startSunday);
    
    while (currentDate <= endSunday) {
      const week = [];
      const weekStart = new Date(currentDate);
      
      const isFirstWeekOfMonth = currentDate.getDate() <= 7;
      if (isFirstWeekOfMonth) {
        monthLabels.push({
          week: weeks.length,
          label: currentDate.toLocaleDateString('en-US', { month: 'short' })
        });
      }
      
      for (let day = 0; day < 7; day++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + day);
        
        const dateStr = dayDate.toISOString().split('T')[0];
        const count = playsMap[dateStr] || 0;
        const isInRange = dayDate >= startDate && dayDate <= today;
        const dayOfWeek = dayDate.getDay();
        
        week.push({
          date: dateStr,
          count: isInRange ? count : null,
          dayOfWeek: dayOfWeek
        });
      }
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
      weeks.push(week);
    }
    
    return { weeks, monthLabels };
  };

  const { weeks, monthLabels } = generateGitHubStyleGrid();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-semibold text-blue-400">
          Overall Activity
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
            <div className="text-sm text-gray-300">
              <p>
                {screenSize === 'small' ? 'Last 3 months' : 
                 screenSize === 'medium' ? 'Last 6 months' : 
                 'Last year'} of total listening activity
              </p>
            </div>
            
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
              
              <div className="flex gap-0.5">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3 h-3 rounded-sm ${
                          day.count !== null ? getColorClass(day.count) : 'bg-transparent'
                        }`}
                        title={day.count !== null ? `${day.date}: ${day.count} total plays` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
              <span 
                title="0 plays per day"
                className="cursor-help"
              >
                Less
              </span>
              <div className="flex gap-1">
                <div 
                  className="w-2.5 h-2.5 rounded-sm bg-gray-700"
                  title="0 plays"
                ></div>
                <div 
                  className="w-2.5 h-2.5 rounded-sm bg-red-200"
                  title="1-20 plays"
                ></div>
                <div 
                  className="w-2.5 h-2.5 rounded-sm bg-red-400"
                  title="21-40 plays"
                ></div>
                <div 
                  className="w-2.5 h-2.5 rounded-sm bg-red-600"
                  title="41-75 plays"
                ></div>
                <div 
                  className="w-2.5 h-2.5 rounded-sm bg-red-800"
                  title="76+ plays"
                ></div>
              </div>
              <span 
                title="76+ plays per day"
                className="cursor-help"
              >
                More
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardHeatmap;