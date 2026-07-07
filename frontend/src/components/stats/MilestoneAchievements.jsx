import { useState, useEffect } from 'react';
import { ChevronDownIcon, TrophyIcon, MusicalNoteIcon, CircleStackIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import Panel from '../ui/Panel';

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
        bg: 'bg-brand-500/15',
        border: 'border-brand-500/40',
        text: 'text-brand-400',
        accent: 'bg-brand-500'
      },
      purple: {
        bg: 'bg-highlight-500/15',
        border: 'border-highlight-500/40',
        text: 'text-highlight-400',
        accent: 'bg-highlight-500'
      },
      green: {
        bg: 'bg-success-500/15',
        border: 'border-success-500/40',
        text: 'text-success-400',
        accent: 'bg-success-500'
      }
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="bg-surface-900 rounded p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrophyIcon className="w-5 h-5 text-warning-400" />
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400">Milestone Achievements</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-surface-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-surface-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-900 rounded p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrophyIcon className="w-5 h-5 text-warning-400" />
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400">Milestone Achievements</h2>
        </div>
        <div className="text-danger-400 text-sm">
          Failed to load milestones: {error}
        </div>
      </div>
    );
  }

  const colorClasses = getColorClasses(currentCategory.color);

  return (
    <div className="bg-surface-900 rounded p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrophyIcon className="w-5 h-5 text-warning-400" />
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400">Milestone Achievements</h2>
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded border border-surface-600 transition-colors"
          >
            <currentCategory.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{currentCategory.name}</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-800 rounded border border-surface-600 shadow-xl z-10">
              {Object.entries(MILESTONE_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(key)}
                  className={`w-full px-4 py-3 text-left hover:bg-surface-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                    selectedCategory === key ? 'bg-surface-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="w-5 h-5" />
                    <div>
                      <div className="text-white font-medium">{category.name}</div>
                      <div className="text-surface-400 text-xs">{category.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="font-mono text-xs text-surface-500 mb-4">
        {currentCategory.description} &middot; {currentCategory.milestones.map(formatMilestone).join(', ')} plays
      </div>

      {/* Milestone Grid, styled as certification plaques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentCategory.milestones.map(milestone => {
          const achievementData = currentData[milestone];
          const image = selectedCategory === 'tracks' ? achievementData?.primary_album_image
            : selectedCategory === 'albums' ? achievementData?.album_image
            : achievementData?.artist_image;
          const name = achievementData && (achievementData.track_name || achievementData.album_name || achievementData.artist);

          return (
            <Panel
              key={milestone}
              className="p-4 flex items-center gap-4"
            >
              {/* The badge medallion carries the category color as a certification
                  plaque accent — the card itself stays neutral like every other
                  stat panel, rather than washing the whole tile in a category tint. */}
              <div className={`shrink-0 w-16 h-16 rounded-full ${colorClasses.bg} border-2 ${colorClasses.border} flex flex-col items-center justify-center`}>
                <span className={`font-mono font-bold text-sm ${colorClasses.text} leading-none`}>
                  {formatMilestone(milestone)}
                </span>
                <span className="font-display text-[9px] uppercase tracking-wide text-surface-500 leading-none mt-1">
                  plays
                </span>
              </div>

              {achievementData ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    {image && (
                      <img
                        src={image}
                        alt={name}
                        className="w-10 h-10 object-cover rounded ring-1 ring-brand-400/30 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.6)] sepia-[.45] saturate-[.7] contrast-[1.05] transition-[filter] duration-300 hover:sepia-0 hover:saturate-100 hover:contrast-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{name}</div>
                      <div className="text-surface-400 text-sm truncate">
                        {selectedCategory === 'tracks' && `${achievementData.primary_artist_name} · ${achievementData.primary_album_name}`}
                        {selectedCategory === 'albums' && achievementData.primary_artist_name}
                        {selectedCategory === 'artists' && `${achievementData.total_plays} total plays`}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-surface-500 space-y-0.5">
                    {selectedCategory !== 'artists' && (
                      <div>{achievementData.total_plays} total plays</div>
                    )}
                    {achievementData.days_to_milestone && (
                      <div>Reached in {formatDaysToMilestone(achievementData.days_to_milestone)}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-surface-500 text-sm italic">
                  Not yet certified
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}