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
  
  // Track view page
  trackView: {
    recent: 5,
    dailyPlaysDays: 90  // Days for daily plays chart
  },
  
  // Explore page
  explore: {
    pageSize: 25,  // Items per page in explore view
    items: 20      // Legacy - keeping for backwards compatibility
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
    artists: "7day",
    tracks: "7day",
    albums: "7day"
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

// Alphabetical category configuration
export const ALPHA_CATEGORIES = {
  letters: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
  other: "#", // Non-alphabetic
  defaultCategory: "A"
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

// Recharts (Trends / Discovery charts) theme — mirrors the CSS custom
// properties in index.css so these graphs read as part of the same
// "record-collector's ledger" system rather than a default dark-dashboard
// theme. Uses var() so a re-theme via index.css alone still reaches these.
export const CHART_THEME = {
  grid: 'var(--color-surface-700)',
  axis: 'var(--color-surface-400)',
  tooltipBg: 'var(--color-surface-800)',
  tooltipBorder: 'var(--color-surface-700)',
  tooltipText: 'var(--color-surface-100)',
  tooltipLabel: 'var(--color-surface-300)',
  brushFill: 'var(--color-surface-700)',
  fontFamily: 'var(--font-mono)',
};

// Rotation of accent hues for single-series charts (one metric shown at a
// time) — the app's own analog-gauge accents, not stock chart-library
// rainbow colors, so whichever metric is selected still feels on-brand.
export const CHART_ACCENT_ROTATION = [
  'var(--color-brand-400)',
  'var(--color-highlight-400)',
  'var(--color-success-400)',
  'var(--color-danger-400)',
  'var(--color-warning-400)',
];

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