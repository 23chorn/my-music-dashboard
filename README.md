# 🎵 My Music Dashboard

> **A comprehensive full-stack web application for analyzing and visualizing personal music listening history with advanced statistics, interactive charts, and intelligent data processing.**

![Music Dashboard](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react) ![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169e1?style=flat&logo=postgresql) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38b2ac?style=flat&logo=tailwind-css)

## ✨ Features

### 📊 **Advanced Analytics Dashboard**
- **Top Artists, Albums & Tracks** with dynamic period filtering (7d, 1m, 3m, 6m, 1y, all-time)
- **Unique Statistics**: Total plays, unique tracks/artists/albums, listening time, repeat factors
- **Diversity Scores**: Analyze your music discovery patterns
- **Interactive Charts**: Daily play heatmaps and trend visualizations

### 🔍 **Intelligent Search & Discovery**
- **Real-time search** across all artists, albums, and tracks
- **Play count ranking** for relevance-based results
- **Advanced filtering** by alphabetical categories and play thresholds

### 📱 **Responsive Explore Experience**
- **Paginated browsing** with server-side performance optimization
- **Alphabetical navigation** (A-Z + numbers/symbols)
- **Mobile-optimized** layouts that adapt to screen size
- **Play count filtering** to discover hidden gems or focus on favorites

### 🎨 **Detailed Entity Views**
- **Artist/Album/Track pages** with comprehensive statistics
- **Recent play history** and milestone tracking
- **Daily play charts** showing listening patterns over time
- **Related content** discovery and cross-linking

### 🔄 **Dual-Source Data Sync**
- **Spotify Web API** integration for rich metadata and recent plays
- **Last.fm API** support for historical data import
- **Intelligent deduplication** preventing data conflicts
- **Automatic metadata enrichment** (duration, popularity, release dates, images)

### 🎯 **Modern User Experience**
- **Hip-hop themed loading messages** with smooth transitions
- **Full viewport layouts** ensuring consistent visual experience
- **Centralized configuration** for easy customization
- **Fast, responsive design** built for music exploration

## 🏗️ Architecture

### **Frontend** (React 19 + Vite)
```
src/
├── components/           # Organized UI components
│   ├── ui/              # Base components (buttons, tiles, loading)
│   ├── layout/          # Layout components (PageLayout)
│   ├── charts/          # Recharts visualizations
│   └── sections/        # Page sections (grouped content)
├── pages/               # Main views (Dashboard, Explore, Artist, Album, Track)
├── hooks/               # Custom React hooks for data & state
├── data/                # API client functions
└── config/              # Centralized app configuration
```

### **Backend** (Node.js + Express + PostgreSQL)
```
src/
├── db/                  # Modular database layer
│   ├── connection.js    # PostgreSQL connection management
│   ├── analytics.js     # Statistics and metrics queries
│   ├── topQueries.js    # Ranking and top content queries
│   ├── search.js        # Multi-table search functionality
│   └── [entity]Db.js    # Specialized entity operations
├── routes/              # Resource-based API endpoints
├── services/            # External API integrations
│   ├── musicSync.js     # Main sync coordinator
│   ├── spotify.js       # Spotify Web API client
│   └── lastfm.js        # Last.fm API client
└── utils/               # Logging, timezone, period utilities
```

### **Database Schema** (PostgreSQL)
- **Normalized structure** with proper foreign key relationships
- **External ID mapping** for Spotify/Last.fm integration
- **Junction tables** for many-to-many relationships
- **Optimized indexes** for large-scale data performance

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v12+)
- **Spotify Developer Account** (for data sync)
- **Last.fm API Key** (optional, for historical data)

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
   # Create PostgreSQL database and run migrations
   # (See backend/scripts/ for migration utilities)
   ```

### Environment Configuration

Create `.env` file in `/backend/`:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/music_dashboard

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Last.fm API (optional)
LASTFM_API_KEY=your_lastfm_api_key

# App Configuration
TZ=Europe/London
SYNC_METHOD=spotify
```

## 📊 API Reference

### **Resource Endpoints**
```
GET  /api/artist/top              # Top artists with period filtering
GET  /api/artist/all              # Paginated artist browsing
GET  /api/artist/:id              # Individual artist details
GET  /api/album/top               # Top albums
GET  /api/track/top               # Top tracks
GET  /api/track/recent            # Recent play history
GET  /api/search?q=query          # Multi-entity search
GET  /api/analytics/daily-plays   # Daily play statistics
GET  /api/unique-counts           # Global statistics
POST /api/spotify/sync            # Trigger data sync
```

### **Query Parameters**
- `limit` - Number of results (default: varies by endpoint)
- `period` - Time range: `7day`, `1month`, `3month`, `6month`, `12month`, `overall`
- `page` - Page number for pagination
- `sortBy` - Sort method: `plays`, `alpha`
- `category` - Alphabetical filter: `A`, `B`, ..., `Z`, `#`

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
npm run dev          # Development with auto-reload
```

### **Database Management**
```bash
cd backend/scripts
node migration-script.js    # Run database migrations
node sync-script.js         # Manual data sync
```

## 📈 Performance Features

- **Server-side pagination** for handling large datasets
- **Optimized PostgreSQL queries** with CTEs and proper indexing
- **Lazy loading** and code splitting in React
- **Caching strategies** for frequently accessed data
- **Background sync processes** for data updates
- **Responsive image loading** with lazy loading

## 🎨 Design Philosophy

- **Mobile-first responsive design** ensuring usability across all devices
- **Hip-hop inspired loading states** for engaging user experience
- **Consistent visual hierarchy** with Tailwind CSS utility classes
- **Accessibility considerations** with proper ARIA labels and keyboard navigation
- **Performance-optimized** with minimal bundle sizes and fast load times

## 🔧 Customization

### **Configuration**
- **Frontend**: Edit `src/config/appConfig.js` for limits, periods, and UI settings
- **Backend**: Modify environment variables and database connection settings
- **Styling**: Customize Tailwind CSS configuration in `tailwind.config.js`

### **Adding New Features**
- **Database**: Add new tables/queries in appropriate `src/db/` files
- **API**: Create new routes in `src/routes/` following resource-based patterns
- **Frontend**: Add components in organized folders (`ui/`, `charts/`, etc.)

## 📝 License

This is a personal project built for analyzing individual music listening history. The code is open source for reference and educational purposes.

## 🎵 Built with Music in Mind

This dashboard is designed by music lovers, for music lovers. Every feature is crafted to help you discover patterns, rediscover forgotten favorites, and gain deeper insights into your musical journey. From the hip-hop themed loading messages to the comprehensive statistics, every detail celebrates the joy of music discovery.

---

**Happy exploring your music data! 🎧✨**