# AI Chat Guide

This guide shows you what questions you can ask the AI chat assistant about your music listening data.

## Overview

The AI chat can access **13 different functions** to analyze your listening history across various time periods and provide insights about your music preferences, patterns, and trends.

---

## Time Periods

Most functions accept a time period parameter. Here are the available options:

- `7d` - Last 7 days
- `1m` - Last month (30 days)
- `3m` - Last 3 months (90 days)
- `6m` - Last 6 months (180 days)
- `1y` - Last year (365 days)
- `all` - All time (your complete listening history)

---

## Available Functions & Example Prompts

### 1. Top Artists (`getTopArtists`)
Get your most played artists for any time period.

**Example Prompts:**
- "What are my top 5 artists this month?"
- "Show me my top 10 artists of all time"
- "Who are my most played artists this week?"
- "Top artists from the last 6 months"
- "Give me my top 3 artists this year"

**What the AI returns:**
- Artist name
- Play count
- Artist image

---

### 2. Top Tracks (`getTopTracks`)
Get your most played tracks for any time period.

**Example Prompts:**
- "What are my top songs this month?"
- "Show me my 10 most played tracks of all time"
- "What songs have I listened to most this week?"
- "Top tracks from the last 3 months"
- "My most played songs this year"

**What the AI returns:**
- Track name
- Artist name
- Album name
- Play count

---

### 3. Top Albums (`getTopAlbums`) ✨ NEW
Get your most played albums for any time period.

**Example Prompts:**
- "What are my top albums this month?"
- "Show me my most played albums of all time"
- "Top 5 albums from the last year"
- "Which albums have I listened to most this week?"
- "My favorite albums from the last 6 months"

**What the AI returns:**
- Album name
- Artist name
- Play count
- Album artwork
- Release date

---

### 4. Listening Statistics (`getListeningStats`)
Get comprehensive statistics about your listening behavior.

**Example Prompts:**
- "Give me my listening statistics"
- "What are my overall listening stats?"
- "Show me my music listening summary"
- "How much music have I listened to?"
- "What's my listening behavior like?"

**What the AI returns:**
- Total plays
- Unique tracks, artists, albums
- Total listening time (hours)
- Repeat factor (how often you replay songs)
- Diversity score (variety in your listening)
- Peak listening hour
- Most active day
- Discovery metrics
- Calculated statistics (tracks per artist, hours per day, etc.)

---

### 5. Genre Breakdown (`getGenreBreakdown`) ✨ NEW
Get genre distribution and percentages for any time period.

**Example Prompts:**
- "What genres do I listen to?"
- "Show me my genre breakdown this month"
- "What percentage of my music is hip-hop?"
- "Genre distribution for the last year"
- "What are my top 5 genres?"

**What the AI returns:**
- Genre name
- Play count for each genre
- Percentage of total listening
- Top 20 genres ranked by plays

---

### 6. Listening Time Patterns (`getListeningTimePatterns`) ✨ NEW
Understand when you listen to music most.

**Example Prompts:**
- "When do I listen to music most?"
- "What are my peak listening hours?"
- "What day of the week do I listen to music most?"
- "Show me my listening patterns"
- "What time of day am I most active?"

**What the AI returns:**
- Peak listening hours (top 3 hours with play counts)
- Hourly distribution (plays for each hour 0-23)
- Peak days of week (top 3 days with play counts)
- Daily distribution (plays for each day Sun-Sat)

---

### 7. Discovery Statistics (`getDiscoveryStats`) ✨ NEW
Track your music discovery patterns for any time period.

**Example Prompts:**
- "How much new music have I discovered this month?"
- "What's my discovery rate?"
- "How many new artists did I find this year?"
- "Am I discovering more music lately?"
- "Show me my discovery stats for the last 3 months"

**What the AI returns:**
- Number of new tracks discovered
- Number of new artists discovered
- Number of new albums discovered
- Total plays in the period
- Discovery rate (percentage of plays that were new music)

---

### 8. Recent Discoveries (`getRecentDiscoveries`) ✨ NEW
See the newest music you've started listening to.

**Example Prompts:**
- "What new music have I discovered recently?"
- "Show me my last 10 discoveries"
- "What tracks did I just start listening to?"
- "My recent discoveries"
- "New music I've found"

**What the AI returns:**
- Track name
- Artist name
- When you first played it
- Total times you've played it since discovery

---

### 9. Artist Details (`getArtistDetails`)
Get detailed information about a specific artist.

**Example Prompts:**
- "Tell me about Drake"
- "How many times have I listened to The Weeknd?"
- "Give me details on Kendrick Lamar"
- "What do you know about [artist name]?"
- "Show me my listening stats for [artist]"

**What the AI returns:**
- Artist name
- Total play count
- Artist image
- Genres associated with the artist

---

### 10. Album Details (`getAlbumDetails`) ✨ NEW
Get comprehensive information about a specific album.

**Example Prompts:**
- "Tell me about the album 'Take Care'"
- "Show me details for 'After Hours'"
- "What tracks are on 'good kid, m.A.A.d city'?"
- "How many times have I played the album [album name]?"
- "Give me info on [album name]"

**What the AI returns:**
- Album name
- Artist name
- Album artwork
- Release date
- Total play count for the album
- Complete track listing with individual play counts
- Track numbers

---

### 11. Track Details (`getTrackDetails`) ✨ NEW
Get detailed information about a specific track.

**Example Prompts:**
- "How many times have I played 'God's Plan'?"
- "Tell me about the song 'Blinding Lights'"
- "Details on [track name]"
- "When did I first listen to [song]?"
- "Show me stats for [track name]"

**What the AI returns:**
- Track name
- Artist name
- Album name
- Duration
- Total play count
- When you first played it
- When you last played it

---

### 12. Compare Artists (`compareArtists`) ✨ NEW
Compare listening statistics between two artists.

**Example Prompts:**
- "Do I listen to Drake or Kendrick more?"
- "Compare The Weeknd and Frank Ocean"
- "Who do I play more, [artist1] or [artist2]?"
- "Drake vs The Weeknd"
- "Compare my listening between [artist1] and [artist2]"

**What the AI returns:**
For each artist:
- Artist name
- Total play count
- Number of unique tracks played
- When you first played them
- When you last played them

---

### 13. Search Music (`searchMusic`)
Search across your entire listening history.

**Example Prompts:**
- "Search for Drake"
- "Find songs with 'love' in the title"
- "Look up The Weeknd"
- "Search for [query]"

**What the AI returns:**
- Top 5 matching artists (name, plays)
- Top 5 matching albums (name, artist, plays)
- Top 5 matching tracks (name, artist, plays)

---

## Complex & Multi-Step Questions

The AI can combine multiple functions to answer complex questions:

### Genre & Style Analysis
- "What percentage of my music is hip-hop and how does that compare to R&B?"
- "Show me my genre breakdown and tell me which genres I've been listening to more lately"

### Discovery Patterns
- "Am I discovering more new music this year compared to my overall discovery rate?"
- "What new artists have I found recently and which ones am I listening to most?"

### Time-Based Analysis
- "Do I listen to different genres at different times of day?"
- "What are my peak listening hours and what artists do I play most during those times?"

### Comparative Analysis
- "Compare my top 3 artists and tell me about their genres"
- "How does my listening this month compare to my all-time favorites?"

### Deep Dives
- "Tell me about my most played album and show me which tracks I play most"
- "What's my most played song and when did I discover it?"

---

## Natural Language Understanding

The AI understands natural language, so you can ask questions in many different ways:

**Formal:**
- "Please provide my top 5 artists for the last month"

**Casual:**
- "top 5 artists this month"
- "who am i listening to most?"
- "show me my fav songs"

**Conversational:**
- "I'm curious about my listening habits, what can you tell me?"
- "Do I have a favorite genre?"
- "What music am I into lately?"

---

## Tips for Best Results

1. **Be specific about time periods:**
   - ✅ "top artists this month"
   - ❌ "top artists recently" (AI will guess the period)

2. **Use exact names for lookups:**
   - ✅ "Tell me about Drake"
   - ✅ "Album details for 'Take Care'"

3. **Ask follow-up questions:**
   - The AI remembers context from earlier in the conversation
   - "Tell me more about that"
   - "Compare those two artists"

4. **Combine multiple questions:**
   - "What are my top 3 genres and top 5 artists in each genre?"
   - "Show me my discovery stats and recent discoveries"

---

## Current Limitations

1. **Historical comparisons:** The AI can only access current data, not historical snapshots
   - ❌ "How did my listening change from January to March?"
   - ✅ "Show me my listening for the last 3 months"

2. **Mood/energy analysis:** The AI cannot analyze track audio features
   - ❌ "What's my most upbeat playlist?"
   - ✅ "What are my top tracks this month?"

3. **Custom time ranges:** Limited to predefined periods (7d, 1m, 3m, 6m, 1y, all)
   - ❌ "Show me my top artists from January 1-15"
   - ✅ "Show me my top artists this month"

4. **Playlist analysis:** Cannot analyze or create playlists
   - ❌ "Create a playlist from my top songs"
   - ✅ "What are my top songs this month?"

---

## Future Capabilities (Coming Soon)

### Phase 2 - Advanced Features
- **Custom SQL queries:** Ask any question about your data
- **Listening profile context:** AI will know your overall listening habits
- **Tag-based queries:** "Show me music I tagged as 'workout'"
- **Milestone tracking:** "What listening milestones have I hit?"
- **Trend analysis:** "How has my listening evolved over the past year?"

### Phase 3 - Semantic Understanding (RAG)
- **Abstract questions:** "Tell me about my listening journey"
- **Recommendations:** "Suggest artists I might like based on my taste"
- **Pattern recognition:** "Do I listen to different music when I'm productive?"

---

## Examples by Use Case

### **Weekly Review**
```
"What are my top 5 artists and top 5 songs this week?
Also, show me how much new music I discovered."
```

### **Monthly Summary**
```
"Give me my listening stats for this month including genre breakdown,
peak hours, and discovery rate."
```

### **Artist Deep Dive**
```
"Tell me about Drake - how many times have I listened,
what albums and tracks do I play most, and compare him to The Weeknd."
```

### **Discovery Check**
```
"What new music have I discovered recently and am I discovering
more or less music compared to my usual rate?"
```

### **Genre Exploration**
```
"What are my top 5 genres and show me my top artists in each genre?"
```

### **Time Pattern Analysis**
```
"When do I listen to music most? Show me my peak hours and days,
and tell me what I typically play during those times."
```

---

## Getting Started

1. Open the AI chat at `/chat`
2. Start with a simple question like:
   - "What are my top 5 artists this month?"
   - "Show me my listening stats"
3. Ask follow-up questions based on the results
4. Experiment with different time periods and combinations!

---

## Troubleshooting

**AI says "Artist not found":**
- Make sure you've spelled the name correctly
- Try using just the first part of the name
- The artist must be in your listening history

**AI gives generic response:**
- Rephrase your question to match one of the example prompts
- Be more specific about what data you want
- Specify a time period

**Function call fails:**
- Check the backend logs for errors
- Ensure your database is connected
- Try asking a simpler question first

---

## Contributing New Functions

Want to add new capabilities? Here's what you need:

1. **Add database query** in `backend/src/db/chatQueries.js`
2. **Add function definition** in `backend/src/services/openai.js`
3. **Wire up the function** in `backend/src/routes/chat.js`
4. **Update this guide** with example prompts!

---

**Last Updated:** October 21, 2025
**Total Functions:** 13
**Version:** 1.0 (Hybrid Approach - Phase 1)
