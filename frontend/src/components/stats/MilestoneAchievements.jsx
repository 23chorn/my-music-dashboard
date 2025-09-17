import { useState, useEffect } from 'react';
import { ChevronDownIcon, TrophyIcon, StarIcon, MusicalNoteIcon, CircleStackIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

const MILESTONE_CATEGORIES = {
  tracks: {
    name: 'Track Milestones',
    description: 'Quickest to reach play milestones',
    milestones: [10, 100, 200, 300],
    icon: MusicalNoteIcon,
    color: 'blue'
  },
  albums: {
    name: 'Album Milestones',
    description: 'Quickest to reach play milestones',
    milestones: [100, 500, 1000, 2000],
    icon: CircleStackIcon,
    color: 'purple'
  },
  artists: {
    name: 'Artist Milestones',
    description: 'Quickest to reach play milestones',
    milestones: [100, 500, 1000, 2000, 5000],
    icon: MicrophoneIcon,
    color: 'green'
  }
};

export default function MilestoneAchievements() {
  const [selectedCategory, setSelectedCategory] = useState('tracks');
  const [milestonesData, setMilestonesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/analytics/milestones`);

      if (!response.ok) {
        throw new Error('Failed to fetch milestones');
      }

      const data = await response.json();
      setMilestonesData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = MILESTONE_CATEGORIES[selectedCategory];
  const currentData = milestonesData?.[selectedCategory] || {};

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setDropdownOpen(false);
  };

  const formatMilestone = (milestone) => {
    if (milestone >= 1000) {
      return `${(milestone / 1000).toFixed(milestone % 1000 === 0 ? 0 : 1)}K`;
    }
    return milestone.toString();
  };

  const formatDaysToMilestone = (days) => {
    const numDays = parseFloat(days);
    if (numDays < 0.1) {
      return 'same day';
    } else if (numDays < 1) {
      return 'less than 1 day';
    } else if (numDays < 7) {
      return `${numDays.toFixed(1)} days`;
    } else if (numDays < 30) {
      return `${Math.round(numDays)} days`;
    } else if (numDays < 365) {
      const months = (numDays / 30).toFixed(1);
      return `${months} months`;
    } else {
      const years = (numDays / 365).toFixed(1);
      return `${years} years`;
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        accent: 'bg-blue-500'
      },
      purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-400',
        accent: 'bg-purple-500'
      },
      green: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-400',
        accent: 'bg-green-500'
      }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrophyIcon className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Milestone Achievements</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrophyIcon className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Milestone Achievements</h2>
        </div>
        <div className="text-red-400 text-sm">
          ⚠️ Failed to load milestones: {error}
        </div>
      </div>
    );
  }

  const colorClasses = getColorClasses(currentCategory.color);

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrophyIcon className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Milestone Achievements</h2>
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors"
          >
            <currentCategory.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{currentCategory.name}</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-10">
              {Object.entries(MILESTONE_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(key)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                    selectedCategory === key ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="w-5 h-5" />
                    <div>
                      <div className="text-white font-medium">{category.name}</div>
                      <div className="text-gray-400 text-xs">{category.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-gray-400 text-sm mb-4">
        {currentCategory.description} • {currentCategory.milestones.map(formatMilestone).join(', ')} plays
      </div>

      {/* Milestone Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentCategory.milestones.map(milestone => {
          const achievementData = currentData[milestone];

          return (
            <div
              key={milestone}
              className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg p-4 hover:bg-opacity-20 transition-all`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`${colorClasses.accent} w-2 h-2 rounded-full`}></div>
                  <span className={`${colorClasses.text} font-semibold`}>
                    {formatMilestone(milestone)} Plays
                  </span>
                </div>
                <StarIcon className={`w-4 h-4 ${colorClasses.text}`} />
              </div>

              {achievementData ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* Show appropriate image based on category */}
                    {(selectedCategory === 'tracks' && achievementData.primary_album_image) && (
                      <img
                        src={achievementData.primary_album_image}
                        alt={achievementData.primary_album_name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    {(selectedCategory === 'albums' && achievementData.album_image) && (
                      <img
                        src={achievementData.album_image}
                        alt={achievementData.album_name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    {(selectedCategory === 'artists' && achievementData.artist_image) && (
                      <img
                        src={achievementData.artist_image}
                        alt={achievementData.artist}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {achievementData.track_name || achievementData.album_name || achievementData.artist}
                      </div>
                      <div className="text-gray-400 text-sm truncate">
                        {selectedCategory === 'tracks' && `${achievementData.primary_artist_name} • ${achievementData.primary_album_name}`}
                        {selectedCategory === 'albums' && achievementData.primary_artist_name}
                        {selectedCategory === 'artists' && `${achievementData.total_plays} total plays`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {selectedCategory !== 'artists' && (
                      <div>{achievementData.total_plays} total plays</div>
                    )}
                    {achievementData.days_to_milestone && (
                      <div className="text-xs text-gray-400">
                        Reached in {formatDaysToMilestone(achievementData.days_to_milestone)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic">
                  No data available
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}