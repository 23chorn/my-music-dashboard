#!/bin/bash

# Track Artist Enrichment Script Runner
# This script helps you run the track enrichment with proper environment setup

cd "$(dirname "$0")/.."

echo "🎵 Track Artist Enrichment Script"
echo "=================================="

# Check if we're in test mode
if [ "$1" = "--test" ] || [ "$1" = "--dry-run" ]; then
    echo "🧪 Running in TEST MODE - no database changes will be made"
    echo ""
    node scripts/enrichTracksWithSpotifyArtists.js --test
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage:"
    echo "  ./scripts/run-track-enrichment.sh              # Run in production mode"
    echo "  ./scripts/run-track-enrichment.sh --test       # Run in test mode (no changes)"
    echo "  ./scripts/run-track-enrichment.sh --dry-run    # Same as --test"
    echo "  ./scripts/run-track-enrichment.sh --help       # Show this help"
    echo ""
    echo "Environment variables required:"
    echo "  DATABASE_URL              # PostgreSQL connection string"
    echo "  SPOTIFY_ACCESS_TOKEN      # Your Spotify access token"
    echo "  SPOTIFY_REFRESH_TOKEN     # Your Spotify refresh token"
    echo "  SPOTIFY_CLIENT_ID         # Your Spotify client ID"
    echo "  SPOTIFY_CLIENT_SECRET     # Your Spotify client secret"
else
    echo "⚠️  PRODUCTION MODE - this will make changes to your database!"
    echo "   Use --test or --dry-run to test without making changes"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Running in production mode..."
        node scripts/enrichTracksWithSpotifyArtists.js
    else
        echo "❌ Cancelled"
        exit 1
    fi
fi