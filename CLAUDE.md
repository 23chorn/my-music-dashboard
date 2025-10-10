# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend (React 19 + Vite + Tailwind CSS 4)
```bash
cd frontend
npm run dev          # Start development server (typically port 5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (Node.js + Express + PostgreSQL)
```bash
cd backend
npm start            # Start server (port 3001)

# Data sync operations
npm run sync:test    # Test sync configuration
npm run sync:run     # Run scheduled sync
npm run sync:force   # Force sync all data
npm run sync:status  # Check sync status

# Database operations
npm run migrate      # Run database migrations
npm run migrate:status # Check migration status
npm run create:migration # Create new migration

# Materialized views
npm run setup:matviews   # Setup materialized views
npm run refresh:matviews # Refresh materialized views
npm run check:matviews   # Check materialized views status

# Database management
npm run db:copy      # Copy database
npm run db:compare   # Compare databases
npm run db:info      # Database information

# Testing
npm run test         # Run all tests
npm run test:api     # Run API tests
npm run test:services # Run service tests
npm run test:db      # Run database tests
```

## Architecture Overview

This is a comprehensive full-stack music dashboard application for analyzing personal Spotify and Last.fm listening history data with advanced statistics, AI-powered insights, tagging system, and responsive design.

### Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router 7, Recharts, Heroicons
- **Backend:** Node.js, Express 5, PostgreSQL, Winston logging
- **AI/ML:** OpenAI API integration for listening analysis and insights
- **Data Sources:** Spotify Web API, Last.fm API
- **Infrastructure:** Centralized configuration, modular database architecture, materialized views, comprehensive testing

### Project Structure

**Backend (`/backend/`):**
- `index.js` - Main Express server with comprehensive API endpoints
- `src/db/` - **Modular database layer** (PostgreSQL operations)
  - `connection.js` - Database connection and pool management
  - `analytics.js` - Statistics and analytics queries
  - `topQueries.js` - Global ranking queries (top artists/tracks/albums)
  - `plays.js` - Play operations and recent track handling
  - `search.js` - Multi-table search functionality
  - `artistDb.js`, `albumDb.js`, `trackDb.js` - Entity-specific operations
  - `spotifyService.js` - Spotify data integration and external ID mapping
  - `insights.js` - Data quality and system health analysis
  - `tags.js` - Tagging system database operations
  - `milestones.js` - Milestone tracking and achievements
  - `trends.js` - Trend analysis and discovery tracking
  - `trendsMatView.js` - Materialized views for performance optimization
  - `discoveries.js` - Music discovery pattern analysis
  - `listeningAnalysis.js` - AI-powered listening behavior analysis
  - `metadata.js` - Metadata management and enrichment
- `src/routes/` - **Resource-based API route handlers**
  - `artist.js`, `album.js`, `track.js` - Entity-specific routes
  - `search.js`, `analytics.js`, `spotify.js` - Feature-specific routes
  - `insights.js` - Data quality and system insights endpoints
  - `tags.js` - Tagging system API endpoints
  - `milestones.js` - Milestone tracking endpoints
  - `trends.js` - Trend analysis endpoints
  - `discoveries.js` - Discovery pattern endpoints
  - `sync.js` - Data synchronization endpoints
  - `system.js` - System health and status endpoints
- `src/services/` - **Clean external API integrations**
  - `lastfm.js` - Last.fm API service
  - `spotify.js` - Spotify Web API service
  - `musicSync.js` - Main sync coordinator (Last.fm/Spotify)
  - `spotifyMusicSync.js` - Spotify-specific sync operations
  - `spotifyDataProcessor.js` - Spotify data processing and transformation
  - `openai.js` - OpenAI API integration for AI insights
- `src/utils/` - Utility functions (logging with Winston, periods, timezone)
- `scripts/` - Data migration, processing, and maintenance scripts
- `migrations/` - Database migration files and runner
- `tests/` - Comprehensive test suite (API, services, database tests)

**Frontend (`/frontend/`):**
- `src/pages/` - Main view components
  - `Dashboard.jsx` - Main dashboard with top content and heatmaps
  - `ExploreView.jsx` - Paginated browsing with filters
  - `ArtistView.jsx`, `AlbumView.jsx`, `TrackView.jsx` - Individual entity pages
  - `StatsView.jsx` - Comprehensive statistics and system metrics
  - `InsightsView.jsx` - Data quality and system health insights
  - `AIInsightsView.jsx` - AI-powered listening analysis and insights
  - `TagsPage.jsx`, `TagFilterPage.jsx` - Tagging system management
- `src/components/` - **Organized reusable UI components**
  - `ui/` - Base UI components (buttons, loading, tiles, context menus, tag displays)
  - `layout/` - Layout components (AppLayout, PageLayout, AppHeader)
  - `navigation/` - Navigation components (SearchBar, SidePanel, MenuButton)
  - `charts/` - Chart components (Recharts-based visualizations, custom heatmaps)
  - `sections/` - Page section components (grouped content areas, milestones)
  - `controls/` - Form controls (dropdowns, filters, pagination)
  - `stats/` - Statistics components (stat cards, calculated metrics, behavior analysis)
  - `insights/` - Data quality and system insight components
  - `trends/` - Trend analysis and discovery tracking components
  - `track/` - Track-specific components (media lists, track details)
  - `explore/` - Explore page specific components (filters, selectors)
  - `forms/` - Form components and filter controls
  - `common/` - Shared components (stat popups)
- `src/data/` - API client functions for backend communication
- `src/hooks/` - Custom React hooks (useSearch for global search functionality)
- `src/config/` - **Centralized configuration** (appConfig.js with limits, periods, grid config, etc.)

### Database Schema
The PostgreSQL database follows a normalized structure with comprehensive relationships:

**Core Music Entities:**
- `artists` - Artist information with images and metadata
  - `id` (IDENTITY), `name`, `image_url`, `last_fetched`
- `albums` - Album details with release information
  - `id` (IDENTITY), `name`, `release_date`, `release_precision`, `image_url`, `last_fetched`
- `tracks` - Track metadata with duration and popularity
  - `id` (IDENTITY), `name`, `duration_ms`, `popularity`, `release_date`, `release_precision`, `last_fetched`
- `genres` - Music genre classifications
  - `id` (IDENTITY), `name` (UNIQUE)
- `plays` - Individual listening events with timestamps
  - `id` (IDENTITY), `track_id` (FK), `played_at`

**Relationship Tables (Many-to-Many):**
- `track_artists` - Track-artist relationships with primary artist designation
  - `track_id` (FK), `artist_id` (FK), `is_primary`
- `track_albums` - Track-album relationships with disc/track numbers
  - `track_id` (FK), `album_id` (FK), `track_number`, `disc_number`
- `album_artists` - Album-artist relationships
  - `album_id` (FK), `artist_id` (FK)
- `artist_genres` - Artist-genre classifications
  - `artist_id` (FK), `genre_id` (FK)

**Data Integration:**
- `external_ids` - External service ID mappings (Spotify, Last.fm)
  - `id` (IDENTITY), `entity_type`, `entity_id`, `source`, `external_id`

**User Features:**
- `tags` - User-defined organizational tags
  - `id`, `name` (UNIQUE), `color`, `created_at`, `updated_at`
- `entity_tags` - Tag assignments to entities
  - `id`, `tag_id` (FK), `entity_id`, `entity_type`, `created_at`
  - Supports: 'track', 'album', 'artist' entity types

**Analytics & Insights:**
- `listening_analyses` - AI-generated weekly listening insights
  - `id`, `week_start`, `week_end`, listening metrics, AI insights (JSONB)
  - `mood_summary`, `key_insights`, `listening_patterns`, `musical_personality`
  - `trends_vs_previous`, `recommendations`, `openai_model`, `openai_usage`
- `weekly_listening_summaries` - Computed weekly statistics
  - `id`, date range, play counts, top content (JSONB), patterns (JSONB)
  - `repeat_factor`, `discovery_rate`, daily/hourly patterns

**System Management:**
- `metadata` - Application metadata and configuration
  - `key`, `value`, `updated_at`
- `schema_migrations` - Database migration tracking
  - `id`, `version` (UNIQUE), `name`, `applied_at`, `checksum`

**Custom Types:**
- `release_precision_enum` - Date precision levels ('day', 'month', 'year')
- Entity type constraints for flexible polymorphic relationships

**Performance Optimizations:**
- Materialized views for complex analytical queries
- Proper indexing on frequently queried columns
- Foreign key constraints ensuring data integrity

### Key Features
- **Dashboard:** Top artists, albums, tracks with advanced period filtering (7d, 1m, 3m, 6m, 1y, all) and interactive heatmaps
- **Explore Page:** Paginated browsing with alphabetical categories, play count filtering, and sorting options
- **Entity Views:** Detailed artist/album/track pages with comprehensive statistics, recent plays, milestones, and interactive charts
- **Search:** Real-time global search across all content types with play count ranking and instant results
- **Statistics:** Comprehensive stats page with system metrics, listening behavior analysis, and data quality insights
- **AI Insights:** OpenAI-powered weekly listening analysis with trend identification and personalized recommendations
- **Tagging System:** User-defined tags with custom colors for organizing and filtering music content
- **Milestones:** Achievement tracking for play counts, discovery patterns, and listening milestones
- **Insights Dashboard:** Data quality monitoring, sync status, metadata completion tracking
- **Responsive Design:** Mobile-first approach with adaptive layouts, touch-friendly controls, and optimized mobile navigation
- **Advanced Analytics:** Unique counts, listening time, repeat factors, diversity scores, discovery freshness, and behavioral patterns
- **Data Sync:** Robust dual-source sync from Spotify Web API and Last.fm with intelligent deduplication and error handling
- **Performance:** Materialized views, database optimization, and efficient caching for large datasets

### API Endpoints (Resource-based)

**Artists:**
- `GET /api/artists/top` - Top artists with period/limit filtering
- `GET /api/artists/all` - Paginated artist browsing with alphabetical filtering
- `GET /api/artists/:id` - Individual artist details with comprehensive stats
- `GET /api/artists/:id/stats` - Artist-specific statistics and analytics

**Albums:**
- `GET /api/albums/top` - Top albums with period/limit/artist filtering
- `GET /api/albums/all` - Paginated album browsing with filtering options
- `GET /api/albums/:id` - Individual album details with track listings
- `GET /api/albums/:id/stats` - Album-specific statistics and play patterns

**Tracks:**
- `GET /api/tracks/top` - Top tracks with period/limit/artist/album filtering
- `GET /api/tracks/recent` - Recent play history with pagination
- `GET /api/tracks/all` - Paginated track browsing with play count filtering
- `GET /api/tracks/:id` - Individual track details with comprehensive metadata
- `GET /api/tracks/:id/stats` - Track-specific statistics and listening patterns

**Analytics & Search:**
- `GET /api/analytics/daily-plays` - Daily play counts for heatmap charts
- `GET /api/analytics/listening-stats` - Comprehensive listening behavior statistics
- `GET /api/unique-counts` - Global statistics (total plays, unique counts, diversity)
- `GET /api/search` - Multi-entity search with ranking and filtering

**Insights & Data Quality:**
- `GET /api/insights` - System health, data quality, and performance insights
- `GET /api/insights/ai-status` - AI service status and configuration
- `POST /api/insights/analyze-week` - Trigger AI analysis for specific week
- `GET /api/insights/analyses` - Historical AI listening analyses

**Tagging System:**
- `GET /api/tags` - All available tags with usage statistics
- `GET /api/tags/entity/:type/:id` - Tags for specific entity
- `POST /api/tags/entity/:type/:id` - Add tag to entity
- `DELETE /api/tags/entity/:type/:id/:tagId` - Remove tag from entity
- `GET /api/tags/:id/entities` - All entities with specific tag
- `PUT /api/tags/:id` - Update tag properties
- `DELETE /api/tags/:id` - Delete tag

**Milestones & Achievements:**
- `GET /api/milestones` - All milestone definitions and achievements
- `GET /api/milestones/entity/:type/:id` - Milestones for specific entity
- `GET /api/milestones/recent` - Recently achieved milestones

**Trends & Discovery:**
- `GET /api/trends/daily-plays` - Daily play trend data
- `GET /api/trends/cumulative-discovery` - Cumulative discovery patterns
- `GET /api/discoveries/stats` - Discovery statistics and freshness metrics

**Music Sync & System:**
- `POST /api/spotify/sync` - Trigger Spotify data sync
- `GET /api/spotify/status` - Sync service status and last sync info
- `GET /api/spotify/auth-url` - Spotify authentication URL
- `POST /api/spotify/callback` - Spotify OAuth callback
- `GET /api/system/health` - System health and database status
- `GET /api/sync/status` - General sync status across all sources

### Development Guidelines

**Code Organization:**
- Both frontend and backend use ES6 modules (`"type": "module"`)
- Database operations use modular architecture with specialized files for each domain
- Frontend components organized by purpose and feature (ui/, layout/, charts/, sections/, insights/, etc.)
- Configuration centralized in `appConfig.js` with comprehensive limits, periods, and UI settings
- Comprehensive test coverage with dedicated test files for API, services, and database operations

**Database Patterns:**
- PostgreSQL with parameterized queries and `to_timestamp()` for Unix timestamps
- Complex CTEs for ranking, album selection, and analytics logic
- Materialized views for performance optimization on large datasets
- JSONB columns for flexible data storage (insights, patterns, top content)
- External ID mapping for Spotify/Last.fm integration with conflict resolution
- Polymorphic entity relationships using CHECK constraints
- Custom enum types for controlled vocabularies (release_precision)
- Proper indexing on foreign keys, timestamps, and frequently queried columns
- Migration system with version tracking and rollback capabilities
- Data integrity enforced through foreign key constraints and CHECK constraints

**API Design:**
- RESTful resource-based routing with consistent URL patterns
- Comprehensive error handling with descriptive messages and proper HTTP status codes
- Extensive logging via Winston with daily rotation and structured logging
- Parameter validation, sanitization, and rate limiting
- OpenAPI-compatible endpoint documentation
- Consistent response formats with metadata (pagination, timestamps, etc.)

**Frontend Patterns:**
- Custom hooks for data fetching, search functionality, and state management
- Responsive design with Tailwind CSS 4 utility classes and mobile-first approach
- Loading states with randomized hip-hop themed messages and smooth transitions
- Lazy loading, code splitting, and performance optimization
- Centralized configuration for limits, periods, categories, and grid layouts
- Context menus and advanced UI interactions for enhanced user experience
- Global search functionality with real-time results and keyboard navigation

**Performance Considerations:**
- Server-side pagination with SQL LIMIT/OFFSET and total count optimization
- Materialized views for expensive analytical queries
- Complex queries optimized with proper JOINs, CTEs, and subquery optimization
- Frontend pagination and virtual scrolling for large datasets
- Background sync processes with intelligent scheduling and error recovery
- Caching strategies for frequently accessed data and API responses
- Database connection pooling and query optimization
- Image lazy loading and responsive image serving

**AI Integration:**
- OpenAI API integration for weekly listening analysis
- Intelligent prompt engineering for personalized music insights
- Historical context integration for trend analysis
- Error handling and fallback mechanisms for AI service availability
- Cost optimization through selective analysis and caching

**Testing Strategy:**
- Unit tests for database operations and business logic
- API endpoint testing with comprehensive test cases
- Service integration testing for external APIs
- Mock data and fixtures for reliable testing
- Automated test running with watch mode for development