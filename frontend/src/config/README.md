# App Configuration

This directory contains centralized configuration for the Music Dashboard app.

## 📁 Files

- `appConfig.js` - Main configuration file containing all default limits, periods, and UI settings

## 🔧 Configuration Options

### Default Limits

Change the default number of items shown in each section:

```javascript
export const DEFAULT_LIMITS = {
  dashboard: {
    artists: 5,  // ← Change this to set default for dashboard artists
    tracks: 5,   // ← Change this to set default for dashboard tracks
    albums: 5,   // ← Change this to set default for dashboard albums
    recent: 5    // ← Change this to set default for recent plays
  },
  
  artistView: {
    albums: 5,   // ← Default for artist page albums
    tracks: 5,   // ← Default for artist page tracks  
    recent: 5    // ← Default for artist page recent plays
  },
  
  albumView: {
    tracks: 5,   // ← Default for album page tracks
    recent: 5    // ← Default for album page recent plays
  }
};
```

### Available Limit Options

Change which options appear in the limit dropdowns:

```javascript
export const LIMIT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];
//                            ↑ Add or remove values here
```

### Default Periods

Change the default time period for each section:

```javascript
export const DEFAULT_PERIODS = {
  dashboard: {
    artists: "overall",  // ← Change to "7day", "1month", etc.
    tracks: "overall", 
    albums: "overall"
  },
  // ... other sections
};
```

### Heatmap Configuration

Change the date ranges for heatmaps on different screen sizes:

```javascript
export const HEATMAP_CONFIG = {
  dashboard: {
    small: 90,    // ← Mobile: 3 months
    medium: 180,  // ← Tablet: 6 months
    large: 365    // ← Desktop: 1 year
  }
};
```

## 🎯 How It Works

1. **Single Source of Truth** - All default values are defined in one place
2. **Automatic Updates** - Changing values in `appConfig.js` updates the entire app
3. **Type Safety** - Helper functions provide consistent access to config values
4. **Easy Customization** - No need to hunt through multiple files to change defaults

## 🚀 Making Changes

1. Edit `appConfig.js`
2. Save the file  
3. Refresh your browser
4. All sections will use the new defaults

## 💡 Examples

**Want top artists to show 10 items by default?**
```javascript
dashboard: {
  artists: 10, // Changed from 5 to 10
  // ...
}
```

**Want mobile heatmap to show 6 months instead of 3?**
```javascript
dashboard: {
  small: 180, // Changed from 90 to 180
  // ...
}
```

**Want to add more limit options?**
```javascript
export const LIMIT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
//                                                        ↑ Added these
```