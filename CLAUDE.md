# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend (React + Vite)
```bash
cd frontend
npm run dev          # Start development server (typically port 5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (Node.js + Express)
```bash
cd backend
npm start            # Start server (port 3001)
node index.js        # Alternative way to start server
```

## Architecture Overview

This is a full-stack music dashboard application for analyzing personal Spotify and Last.fm listening history data with advanced statistics, search capabilities, and responsive design.

### Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS, React Router, Recharts
- **Backend:** Node.js, Express, PostgreSQL (migrated from SQLite)
- **Data Sources:** Spotify Web API, Last.fm API
- **Infrastructure:** Centralized configuration, modular database architecture

### Project Structure

**Backend (`/backend/`):**
- `index.js` - Main Express server with core API endpoints
- `src/db/` - **Modular database layer** (PostgreSQL operations)
  - `connection.js` - Database connection and pool management
  - `analytics.js` - Statistics and analytics queries
  - `topQueries.js` - Global ranking queries (top artists/tracks/albums)
  - `plays.js` - Play operations and recent track handling
  - `search.js` - Multi-table search functionality
  - `artistDb.js`, `albumDb.js`, `trackDb.js` - Entity-specific operations
  - `spotifyService.js` - Spotify data integration and external ID mapping
- `src/routes/` - **Resource-based API route handlers**
  - `artist.js`, `album.js`, `track.js` - Entity-specific routes
  - `search.js`, `analytics.js`, `spotify.js` - Feature-specific routes
- `src/services/` - **Clean external API integrations**
  - `lastfm.js` - Last.fm API service
  - `spotify.js` - Spotify Web API service
  - `musicSync.js` - Main sync coordinator (Last.fm/Spotify)
  - `spotifyMusicSync.js` - Spotify-specific sync operations
  - `spotifyDataProcessor.js` - Spotify data processing and transformation
- `src/utils/` - Utility functions (logging, periods, timezone)
- `src/config/` - Configuration files
- `scripts/` - Data migration, processing, and maintenance scripts

**Frontend (`/frontend/`):**
- `src/pages/` - Main view components (Dashboard, ArtistView, AlbumView, ExploreView)
- `src/components/` - **Organized reusable UI components**
  - `ui/` - Base UI components (buttons, loading, tiles, etc.)
  - `layout/` - Layout components (PageLayout, navigation)
  - `charts/` - Chart components (Recharts-based visualizations)
  - `sections/` - Page section components (grouped content areas)
- `src/data/` - API client functions for backend communication
- `src/hooks/` - Custom React hooks for data fetching and state management
- `src/config/` - **Centralized configuration** (appConfig.js with limits, categories, etc.)

### Database Schema
The PostgreSQL database follows a normalized structure with external ID mapping:
- `artists` - Artist information with images and metadata
- `albums` - Albums with release dates and images
- `tracks` - Track information with duration and popularity scores
- `plays` - Individual play records with precise timestamps
- `external_ids` - Spotify/Last.fm ID mappings for data integration
- Junction tables: `track_artists`, `track_albums`, `album_artists`, `artist_genres`

### Key Features
- **Dashboard:** Top artists, albums, tracks with advanced period filtering (7d, 1m, 3m, 6m, 1y, all)
- **Explore Page:** Paginated browsing with alphabetical categories, play count filtering
- **Artist/Album/Track Views:** Detailed statistics, recent plays, milestones, interactive charts
- **Search:** Real-time search across all content types with play count ranking
- **Responsive Design:** Mobile-first approach with adaptive layouts and controls
- **Advanced Statistics:** Unique counts, listening time, repeat factors, diversity scores
- **Data Sync:** Dual-source sync from Spotify Web API and Last.fm with deduplication

### API Endpoints (Resource-based)

**Artists:**
- `GET /api/artist/top` - Top artists with period/limit filtering
- `GET /api/artist/all` - Paginated artist browsing with alphabetical filtering
- `GET /api/artist/:id` - Individual artist details
- `GET /api/artist/:id/stats` - Artist-specific statistics

**Albums:**
- `GET /api/album/top` - Top albums with period/limit/artist filtering
- `GET /api/album/all` - Paginated album browsing
- `GET /api/album/:id` - Individual album details
- `GET /api/album/:id/stats` - Album-specific statistics

**Tracks:**
- `GET /api/track/top` - Top tracks with period/limit/artist/album filtering
- `GET /api/track/recent` - Recent play history
- `GET /api/track/all` - Paginated track browsing with play count filtering
- `GET /api/track/:id` - Individual track details
- `GET /api/track/:id/stats` - Track-specific statistics

**Analytics & Search:**
- `GET /api/analytics/daily-plays` - Daily play counts for heatmap charts
- `GET /api/unique-counts` - Global statistics (total plays, unique counts, diversity)
- `GET /api/search` - Multi-entity search with ranking

**Music Sync:**
- `POST /api/spotify/sync` - Trigger Spotify data sync
- `GET /api/spotify/status` - Sync service status

### Development Guidelines

**Code Organization:**
- Both frontend and backend use ES6 modules (`"type": "module"`)
- Database operations use modular architecture with specialized files
- Frontend components organized by purpose (ui/, layout/, charts/, sections/)
- Configuration centralized in `appConfig.js` for easy maintenance

**Database Patterns:**
- PostgreSQL with parameterized queries and `to_timestamp()` for Unix timestamps
- Complex CTEs for ranking and album selection logic
- External ID mapping for Spotify/Last.fm integration
- Proper indexing for performance on large datasets

**API Design:**
- RESTful resource-based routing (preferred over function-based)
- Consistent error handling with descriptive messages
- Comprehensive logging via Winston (logs in `/backend/logs/`)
- Parameter validation and sanitization

**Frontend Patterns:**
- Custom hooks for data fetching and state management
- Responsive design with Tailwind CSS utility classes
- Loading states with randomized hip-hop themed messages
- Lazy loading and code splitting for performance
- Centralized configuration for limits, periods, and categories

**Performance Considerations:**
- Server-side pagination with SQL LIMIT/OFFSET
- Complex queries optimized with proper JOINs and CTEs
- Frontend pagination to reduce data transfer
- Background sync processes for data updates
- Caching strategies for frequently accessed data