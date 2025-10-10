# 🎵 My Music Dashboard

> **A comprehensive full-stack web application for analyzing and visualizing personal music listening history with advanced statistics, AI-powered insights, tagging system, interactive charts, and intelligent data processing.**

![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react) ![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=flat&logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169e1?style=flat&logo=postgresql) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS%204-38b2ac?style=flat&logo=tailwind-css) ![OpenAI](https://img.shields.io/badge/OpenAI-AI%20Insights-00a67e?style=flat&logo=openai)

## ✨ Features

### 📊 **Advanced Analytics Dashboard**
- **Top Artists, Albums & Tracks** with dynamic period filtering (7d, 1m, 3m, 6m, 1y, all-time)
- **Interactive Heatmaps** showing daily listening patterns with responsive sizing
- **Unique Statistics**: Total plays, unique tracks/artists/albums, listening time, repeat factors
- **Diversity Scores**: Analyze your music discovery patterns and freshness metrics
- **Comprehensive Metrics**: Discovery rates, behavioral analysis, and listening trends

### 🤖 **AI-Powered Insights**
- **Weekly Listening Analysis** using OpenAI for personalized music insights
- **Trend Identification** and pattern recognition in your listening habits
- **Personalized Recommendations** based on listening behavior and preferences
- **Historical Context** integration for deeper analysis and comparisons
- **Smart Summaries** of your musical journey and discoveries

### 🏷️ **Advanced Tagging System**
- **Custom Tags** with user-defined colors for organizing music content
- **Entity Tagging** for artists, albums, and tracks with visual indicators
- **Tag-based Filtering** and browsing capabilities
- **Tag Statistics** showing usage patterns and popular tags
- **Bulk Tagging** operations for efficient content organization

### 🔍 **Intelligent Search & Discovery**
- **Global Real-time Search** across all artists, albums, and tracks
- **Play count ranking** for relevance-based results
- **Instant Results** with keyboard navigation and context menus
- **Advanced filtering** by alphabetical categories, play thresholds, and tags
- **Search History** and saved searches for quick access

### 📱 **Responsive Explore Experience**
- **Paginated browsing** with server-side performance optimization
- **Alphabetical navigation** (A-Z + numbers/symbols) with visual indicators
- **Mobile-optimized** layouts with touch-friendly controls
- **Play count filtering** to discover hidden gems or focus on favorites
- **Sorting Options** by plays, alphabetical, or discovery date

### 🎨 **Detailed Entity Views**
- **Comprehensive Entity Pages** for artists, albums, and tracks
- **Advanced Statistics** with milestone tracking and achievements
- **Interactive Charts** showing listening patterns and trends over time
- **Related Content** discovery with intelligent recommendations
- **Tag Management** directly from entity pages
- **Recent Play History** with detailed timestamps and context

### 📈 **System Insights & Monitoring**
- **Data Quality Dashboard** monitoring metadata completion and sync health
- **System Performance** metrics and database optimization insights
- **Sync Status** tracking for Spotify and Last.fm data sources
- **Duplicate Detection** and data integrity monitoring
- **External ID Coverage** analysis for integration completeness

### 🏆 **Milestones & Achievements**
- **Play Count Milestones** for artists, albums, and tracks
- **Discovery Achievements** tracking new music exploration
- **Listening Streaks** and consistency patterns
- **Personal Records** and notable listening sessions
- **Achievement History** with timestamps and context

### 🔄 **Robust Data Sync**
- **Spotify Web API** integration with OAuth authentication
- **Last.fm API** support for historical data import
- **Intelligent deduplication** with conflict resolution
- **Automatic metadata enrichment** (duration, popularity, release dates, images, genres)
- **Scheduled Sync** with error handling and retry mechanisms
- **Manual Sync Control** with force sync capabilities

### 🎯 **Modern User Experience**
- **Hip-hop themed loading messages** with smooth transitions
- **Context Menus** for quick actions and navigation
- **Mobile-first Design** with optimized touch interactions
- **Dark/Light Mode** support with system preference detection
- **Keyboard Shortcuts** for power users
- **Accessibility Features** with ARIA labels and screen reader support

## 🏗️ Architecture

### **Frontend** (React 19 + Vite + Tailwind CSS 4)
```
src/
├── components/          # Organized UI components
│   ├── ui/             # Base components (buttons, tiles, loading, context menus, tags)
│   ├── layout/         # Layout components (AppLayout, PageLayout, AppHeader)
│   ├── navigation/     # Navigation (SearchBar, SidePanel, MenuButton)
│   ├── charts/         # Recharts visualizations and custom heatmaps
│   ├── sections/       # Page sections (grouped content, milestones)
│   ├── controls/       # Form controls (dropdowns, filters, pagination)
│   ├── stats/          # Statistics components (cards, metrics, analysis)
│   ├── insights/       # Data quality and system insight components
│   ├── trends/         # Trend analysis and discovery tracking
│   ├── track/          # Track-specific components (media lists, details)
│   ├── explore/        # Explore page components (filters, selectors)
│   ├── forms/          # Form components and filter controls
│   └── common/         # Shared components (stat popups)
├── pages/              # Main views
│   ├── Dashboard.jsx   # Main dashboard with heatmaps
│   ├── ExploreView.jsx # Paginated browsing
│   ├── StatsView.jsx   # Comprehensive statistics
│   ├── InsightsView.jsx # Data quality insights
│   ├── AIInsightsView.jsx # AI-powered analysis
│   ├── TagsPage.jsx    # Tag management
│   └── [Entity]View.jsx # Artist/Album/Track pages
├── hooks/              # Custom React hooks (useSearch, data fetching)
├── data/               # API client functions
└── config/             # Centralized app configuration
```

### **Backend** (Node.js + Express 5 + PostgreSQL)
```
src/
├── db/                  # Modular database layer
│   ├── connection.js    # PostgreSQL connection and pool management
│   ├── analytics.js     # Statistics and metrics queries
│   ├── topQueries.js    # Ranking and top content queries
│   ├── search.js        # Multi-table search functionality
│   ├── insights.js      # Data quality and system health analysis
│   ├── tags.js          # Tagging system database operations
│   ├── milestones.js    # Milestone tracking and achievements
│   ├── trends.js        # Trend analysis and discovery tracking
│   ├── trendsMatView.js # Materialized views for performance
│   ├── discoveries.js   # Music discovery pattern analysis
│   ├── listeningAnalysis.js # AI-powered listening behavior analysis
│   ├── metadata.js      # Metadata management and enrichment
│   └── [entity]Db.js    # Specialized entity operations
├── routes/              # Resource-based API endpoints
│   ├── insights.js      # Data quality and system insights
│   ├── tags.js          # Tagging system API
│   ├── milestones.js    # Milestone tracking
│   ├── trends.js        # Trend analysis
│   ├── sync.js          # Data synchronization
│   └── [entity].js      # Entity-specific routes
├── services/            # External API integrations
│   ├── musicSync.js     # Main sync coordinator
│   ├── spotify.js       # Spotify Web API client
│   ├── lastfm.js        # Last.fm API client
│   ├── openai.js        # OpenAI API integration
│   └── spotifyDataProcessor.js # Data processing
├── utils/               # Utilities (Winston logging, timezone, periods)
├── migrations/          # Database migration system
├── scripts/             # Maintenance and sync scripts
└── tests/               # Comprehensive test suite
```

### **Database Schema** (PostgreSQL)

**Core Tables:**
```sql
-- Music entities
artists (id, name, image_url, last_fetched)
albums (id, name, release_date, release_precision, image_url, last_fetched)
tracks (id, name, duration_ms, popularity, release_date, release_precision, last_fetched)
genres (id, name)
plays (id, track_id, played_at)

-- Relationship tables
track_artists (track_id, artist_id, is_primary)
track_albums (track_id, album_id, track_number, disc_number)
album_artists (album_id, artist_id)
artist_genres (artist_id, genre_id)

-- Integration & features
external_ids (id, entity_type, entity_id, source, external_id)
tags (id, name, color, created_at, updated_at)
entity_tags (id, tag_id, entity_id, entity_type, created_at)

-- Analytics & insights
listening_analyses (id, week_start, week_end, metrics, ai_insights_jsonb)
weekly_listening_summaries (id, week_range, stats, top_content_jsonb)
metadata (key, value, updated_at)
schema_migrations (id, version, name, applied_at, checksum)
```

**Key Features:**
- **Normalized structure** with proper foreign key relationships and constraints
- **JSONB columns** for flexible analytics data (insights, top content, patterns)
- **External ID mapping** for Spotify/Last.fm integration with conflict resolution
- **Polymorphic relationships** using entity_type constraints for flexible tagging
- **Custom enum types** for controlled vocabularies (release_precision_enum)
- **Materialized views** for performance optimization on complex analytical queries
- **Comprehensive indexing** for sub-second response times on large datasets
- **Migration system** with version tracking for schema evolution

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v12+)
- **Spotify Developer Account** (for data sync and OAuth)
- **OpenAI API Key** (for AI insights - optional)
- **Last.fm API Key** (optional, for historical data import)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/my-music-dashboard.git
   cd my-music-dashboard
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your database and API credentials
   
   # Start the server
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start development server
   npm run dev
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb music_dashboard

   # Run database migrations
   cd backend
   npm run migrate

   # Setup materialized views for performance
   npm run setup:matviews

   # Check migration status
   npm run migrate:status
   ```

### Environment Configuration

Create `.env` file in `/backend/`:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/music_dashboard

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/spotify/callback

# OpenAI API (optional - for AI insights)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Last.fm API (optional)
LASTFM_API_KEY=your_lastfm_api_key

# App Configuration
TZ=Europe/London
SYNC_METHOD=spotify
PORT=3001

# Logging
LOG_LEVEL=info
```

## 🗄️ Database Schema Details

### **Entity Relationships**
```
Artists ←→ Tracks (many-to-many via track_artists)
Albums  ←→ Tracks (many-to-many via track_albums)
Albums  ←→ Artists (many-to-many via album_artists)
Artists ←→ Genres (many-to-many via artist_genres)
Tracks  → Plays (one-to-many)
All Entities ←→ Tags (polymorphic via entity_tags)
```

### **Key Schema Features**

**Flexible Data Types:**
- `release_precision_enum`: Handles varying date precision ('day', 'month', 'year')
- `JSONB columns`: Store complex analytics data with queryable structure
- `entity_type constraints`: Enable polymorphic relationships for tagging system

**Analytics Tables:**
- `listening_analyses`: AI-generated weekly insights with OpenAI metadata
- `weekly_listening_summaries`: Computed statistics with top content and patterns
- `plays`: Individual listening events for precise tracking

**Data Integrity:**
- Foreign key constraints across all relationships
- Unique constraints on critical fields (tag names, genre names)
- Check constraints for entity types and data validation
- Primary keys using IDENTITY columns for performance

**Integration Support:**
- `external_ids`: Maps internal IDs to Spotify/Last.fm IDs
- `metadata`: Application configuration and sync state
- `schema_migrations`: Version control for database evolution

## 📊 API Reference

### **Core Resource Endpoints**
```
# Artists, Albums, Tracks
GET  /api/artist/top              # Top artists with period filtering
GET  /api/artist/all              # Paginated artist browsing
GET  /api/artist/:id              # Individual artist details
GET  /api/album/top               # Top albums with filtering
GET  /api/track/top               # Top tracks with filtering
GET  /api/track/recent            # Recent play history

# Search & Analytics
GET  /api/search?q=query          # Multi-entity search with ranking
GET  /api/analytics/daily-plays   # Daily play statistics
GET  /api/unique-counts           # Global statistics and metrics

# AI Insights
GET  /api/insights/ai-status      # AI service status
POST /api/insights/analyze-week   # Trigger weekly analysis
GET  /api/insights/analyses       # Historical AI analyses

# Tagging System
GET  /api/tags                    # All tags with statistics
POST /api/tags/entity/:type/:id  # Add tag to entity
GET  /api/tags/:id/entities       # Entities with specific tag

# System & Sync
GET  /api/insights                # Data quality and system health
POST /api/spotify/sync           # Trigger data sync
GET  /api/milestones              # Achievements and milestones
```

### **Query Parameters**
- `limit` - Number of results (default: varies by endpoint, max: 50)
- `period` - Time range: `7day`, `1month`, `3month`, `6month`, `12month`, `overall`
- `page` - Page number for pagination (0-based)
- `sortBy` - Sort method: `plays`, `alpha`, `recent`, `discovery_date`
- `category` - Alphabetical filter: `A`, `B`, ..., `Z`, `#`
- `tag` - Filter by tag ID or name
- `minPlays` - Minimum play count filter
- `maxPlays` - Maximum play count filter
- `search` - Search query for filtering results
- `includeStats` - Include detailed statistics in response
- `includeTagged` - Include only tagged or untagged items

## 🛠️ Development

### **Frontend Development**
```bash
cd frontend
npm run dev          # Development server (port 5173)
npm run build        # Production build
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

### **Backend Development**
```bash
cd backend
npm start            # Start server (port 3001)

# Testing
npm run test         # Run all tests
npm run test:api     # API endpoint tests
npm run test:services # Service integration tests
npm run test:db      # Database operation tests

# Data Management
npm run sync:test    # Test sync configuration
npm run sync:run     # Run scheduled sync
npm run sync:force   # Force sync all data

# Database Operations
npm run migrate      # Run database migrations
npm run migrate:status # Check migration status
npm run db:info      # Database information

# Performance Optimization
npm run setup:matviews   # Setup materialized views
npm run refresh:matviews # Refresh materialized views
```

## 📈 Performance Features

- **Server-side pagination** with optimized count queries for large datasets
- **Materialized views** for complex analytical queries with sub-second response times
- **Optimized PostgreSQL queries** with CTEs, proper indexing, and query planning
- **Database connection pooling** for efficient resource utilization
- **Lazy loading** and code splitting in React for faster initial loads
- **Virtual scrolling** for large lists and tables
- **Intelligent caching** strategies for frequently accessed data
- **Background sync processes** with retry mechanisms and error handling
- **Responsive image loading** with lazy loading and progressive enhancement
- **API response optimization** with selective field loading and compression

## 🎨 Design Philosophy

- **Mobile-first responsive design** with touch-optimized interactions across all devices
- **Hip-hop inspired loading states** and personality-driven user experience
- **Consistent visual hierarchy** with Tailwind CSS 4 utility classes and design tokens
- **Dark/Light mode support** with system preference detection
- **Accessibility-first** with comprehensive ARIA labels, keyboard navigation, and screen reader support
- **Performance-optimized** with minimal bundle sizes, lazy loading, and progressive enhancement
- **Context-aware interactions** with smart menus and intuitive navigation patterns
- **Visual feedback** for all user actions with smooth transitions and animations

## 🔧 Customization

### **Configuration**
- **Frontend**: Edit `src/config/appConfig.js` for limits, periods, grid layouts, and UI settings
- **Backend**: Modify environment variables, database settings, and sync configurations
- **Styling**: Customize Tailwind CSS 4 configuration with design tokens and component classes
- **AI Insights**: Configure OpenAI models, prompts, and analysis parameters
- **Sync Settings**: Adjust sync intervals, retry logic, and data source priorities

### **Adding New Features**
- **Database**: Add new tables/queries in modular `src/db/` files with proper migrations
- **API**: Create new routes in `src/routes/` following RESTful resource-based patterns
- **Frontend**: Add components in organized feature folders with proper separation of concerns
- **AI Integration**: Extend OpenAI service with new analysis types and insights
- **Testing**: Add comprehensive test coverage for new functionality
- **Documentation**: Update API documentation and user guides

## 📝 License

This is a personal project built for analyzing individual music listening history. The code is open source for reference and educational purposes.

## 🎵 Built with Music in Mind

This dashboard is designed by music lovers, for music lovers. Every feature is crafted to help you discover patterns, rediscover forgotten favorites, and gain deeper insights into your musical journey. From the hip-hop themed loading messages to the AI-powered weekly insights, every detail celebrates the joy of music discovery.

### 🚀 **What's New**
- **AI-Powered Insights**: Weekly listening analysis with personalized recommendations
- **Advanced Tagging**: Organize your music with custom tags and colors
- **Enhanced Performance**: Materialized views and optimized queries for lightning-fast responses
- **Mobile Optimization**: Touch-friendly interface with optimized navigation
- **System Insights**: Comprehensive data quality monitoring and sync health
- **Milestone Tracking**: Achievement system for your listening journey
- **Global Search**: Instant search across all content with keyboard shortcuts
- **Context Menus**: Quick actions and navigation throughout the interface

### 🔮 **Future Roadmap**
- Social features for sharing insights and discoveries
- Advanced playlist generation based on listening patterns
- Music recommendation engine using collaborative filtering
- Integration with additional music services (Apple Music, YouTube Music)
- Real-time listening activity and live dashboard updates
- Machine learning models for mood and genre analysis

---

**Happy exploring your music data! 🎧✨**