# GitHub Actions Workflows

## Spotify Sync Automation

This repository includes automated Spotify data syncing using GitHub Actions.

### How it works

The `sync-spotify.yml` workflow:
- **Runs every 2 hours** automatically via cron schedule
- **Fetches recent plays** from Spotify API
- **Syncs new data** to your Supabase database
- **Can be triggered manually** for testing

### Setup Instructions

#### 1. Configure Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_ACCESS_TOKEN=your_current_access_token
SPOTIFY_REFRESH_TOKEN=your_refresh_token
DATABASE_URL=your_supabase_database_url
LASTFM_API_KEY=your_lastfm_api_key (optional)
LASTFM_USERNAME=your_lastfm_username (optional)
```

#### 2. Get Spotify Tokens

If you need to refresh your Spotify tokens:

```bash
cd backend
node scripts/spotifySync.js auth
```

Visit the URL, authorize the app, and update your tokens in both:
- Local `.env` file (for development)
- GitHub repository secrets (for automation)

#### 3. Test the Setup

You can manually trigger the workflow to test:
1. Go to Actions tab in your GitHub repository
2. Select "Sync Spotify Plays" workflow
3. Click "Run workflow"
4. Choose sync type: `test`, `sync`, or `force`

### Local Testing

Test your setup locally before enabling automation:

```bash
cd backend

# Test sync (shows what would be synced)
npm run sync:test

# Run actual sync
npm run sync:run

# Force sync (ignores timestamp)
npm run sync:force

# Check status
npm run sync:status
```

### Monitoring

- **View logs**: Go to Actions tab → select workflow run
- **Check frequency**: Workflow runs every 2 hours (00:00, 02:00, 04:00, etc. UTC)
- **Timeout**: Workflow will timeout after 15 minutes if stuck
- **Notifications**: GitHub will notify you if workflows consistently fail

### Troubleshooting

#### Common Issues:

1. **Token Expired**: Refresh your Spotify tokens and update GitHub secrets
2. **Database Connection**: Check your `DATABASE_URL` secret
3. **No New Plays**: Normal if you haven't listened to music recently
4. **Timeout**: Database connection issues or Spotify API slowness

#### Debug Steps:

1. Check the workflow logs in Actions tab
2. Test locally with `npm run sync:test`
3. Verify tokens work with Spotify API
4. Check database connectivity

### Customization

Edit `.github/workflows/sync-spotify.yml` to:
- **Change frequency**: Modify the cron expression
- **Add notifications**: Add Slack/Discord webhooks
- **Extend timeout**: Increase `timeout-minutes`
- **Add more environment variables**: As needed

### Security Notes

- Never commit secrets to the repository
- Rotate Spotify tokens periodically
- Monitor workflow runs for suspicious activity
- Use GitHub's secret scanning features