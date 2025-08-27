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

This is a full-stack music dashboard application for analyzing personal Spotify listening history data.

### Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS, React Router, Recharts
- **Backend:** Node.js, Express, SQLite
- **Data Sources:** Spotify Web API, Last.fm API

### Project Structure

**Backend (`/backend/`):**
- `index.js` - Main Express server with API endpoints
- `src/db/` - Database layer with SQLite operations
- `src/routes/` - API route handlers (artists, albums, tracks, search)
- `src/services/` - External API integrations (Last.fm)
- `src/utils/` - Logging and utility functions
- `data/` - SQLite database files
- `scripts/` - Data migration and processing scripts

**Frontend (`/frontend/`):**
- `src/pages/` - Main view components (Dashboard, ArtistView, AlbumView, ExploreView)
- `src/components/` - Reusable UI components (search, charts, tiles)
- `src/data/` - API client functions for backend communication
- `src/hooks/` - Custom React hooks for data fetching

### Database Schema
The SQLite database follows a normalized structure:
- `artists` - Artist information with optional image URLs
- `albums` - Albums linked to artists with optional image URLs
- `tracks` - Tracks linked to artists and optionally albums
- `plays` - Individual play records with timestamps

### Key Features
- **Dashboard:** Top artists, albums, tracks with period filtering (7d, 1m, 3m, 6m, 1y, all)
- **Artist/Album Views:** Detailed statistics, recent plays, milestones, play history charts
- **Search:** Real-time search across artists, albums, and tracks
- **Data Processing:** Scripts for importing Spotify data, enriching metadata, and deduplication

### API Endpoints
- `/api/top-artists` - Top artists with period/limit filtering
- `/api/top-tracks` - Top tracks with period/limit/artist/album filtering
- `/api/top-albums` - Top albums with period/limit/artist filtering
- `/api/recent-tracks` - Recent play history
- `/api/search` - Search across all content types
- `/api/artist/:id` - Artist-specific data
- `/api/album/:id` - Album-specific data

### Development Notes
- Both frontend and backend use ES6 modules (`"type": "module"`)
- Database operations use async/await pattern with callback-based APIs
- Comprehensive logging via Winston (backend logs in `/backend/logs/`)
- All database queries are handled through `/backend/src/db/db.js`
- Frontend uses dynamic imports for API modules to optimize bundle size
- Responsive design with mobile-first approach using Tailwind CSS