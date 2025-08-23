import { useEffect, useState } from "react";
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { getArtistDailyPlays } from "../data/artistApi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function ArtistHeatmap({ artistId, days = 30, defaultOpen = true }) {
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

  // Show only the past N days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  return (
    <div className="bg-gray-900 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-blue-300">
          Era Explorer: Heatmap of Plays (Past {days} Days)
        </h3>
        <button
          className="p-1 rounded bg-gray-900 hover:bg-gray-800 transition ml-2"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Collapse section" : "Expand section"}
        >
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>
      {open && (
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={dailyPlays.map(row => ({
            date: row.day,
            count: row.count,
          }))}
          classForValue={value => {
            if (!value || value.count === 0) return "color-empty";
            if (value.count < 2) return "color-scale-1";
            if (value.count < 5) return "color-scale-2";
            if (value.count < 10) return "color-scale-3";
            return "color-scale-4";
          }}
          showWeekdayLabels={false}
          showMonthLabels={false}
          gutterSize={2}
          horizontal={false}
          style={{ width: "100%", minHeight: "180px" }}
        />
      )}
    </div>
  );
}