/**
 * Centralized configuration for the Music Dashboard
 * All default limits, options, and UI settings in one place
 */

// Available limit options for all dropdowns
export const LIMIT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

// Default limits for different sections
export const DEFAULT_LIMITS = {
  // Dashboard page
  dashboard: {
    artists: 10,
    tracks: 10,
    albums: 10,
    recent: 5
  },
  
  // Artist view page  
  artistView: {
    albums: 10,
    tracks: 10,
    recent: 5
  },
  
  // Album view page
  albumView: {
    tracks: 5,
    recent: 5
  },
  
  // Explore page (if needed)
  explore: {
    items: 20
  }
};

// Period options for time-based filters
export const PERIOD_OPTIONS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "Last 7 Days" },
  { value: "1month", label: "Last Month" },
  { value: "3month", label: "Last 3 Months" },
  { value: "6month", label: "Last 6 Months" },
  { value: "12month", label: "Last 12 Months" },
];

// Default periods for different sections
export const DEFAULT_PERIODS = {
  dashboard: {
    artists: "overall",
    tracks: "overall", 
    albums: "overall"
  },
  
  artistView: {
    albums: "overall",
    tracks: "overall"
  },
  
  albumView: {
    tracks: "overall"
  }
};

// Heatmap configuration
export const HEATMAP_CONFIG = {
  dashboard: {
    small: 90,    // 3 months for mobile
    medium: 180,  // 6 months for tablet
    large: 365    // 1 year for desktop
  },
  
  artist: {
    days: 90      // 90 days for artist-specific heatmaps
  }
};

// Grid configuration
export const GRID_CONFIG = {
  columns: {
    mobile: 2,        // grid-cols-2
    small: 3,         // sm:grid-cols-3
    medium: 4,        // md:grid-cols-4
    large: 5,         // lg:grid-cols-5
    extraLarge: 6     // xl:grid-cols-6
  },
  gap: 4              // gap-4
};

/**
 * Helper function to get default limit for a specific section and type
 * @param {string} section - Section name (dashboard, artistView, etc.)
 * @param {string} type - Type (artists, tracks, albums, recent)
 * @returns {number} Default limit value
 */
export function getDefaultLimit(section, type) {
  return DEFAULT_LIMITS[section]?.[type] || 5;
}

/**
 * Helper function to get default period for a specific section and type
 * @param {string} section - Section name (dashboard, artistView, etc.)
 * @param {string} type - Type (artists, tracks, albums)
 * @returns {string} Default period value
 */
export function getDefaultPeriod(section, type) {
  return DEFAULT_PERIODS[section]?.[type] || "overall";
}