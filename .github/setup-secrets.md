# GitHub Secrets Setup Guide

## Required Secrets

Copy these values from your local `.env` file to GitHub repository secrets:

### Spotify Configuration
```
SPOTIFY_CLIENT_ID=e8307a82e84943f5a7cc135688627ba1
SPOTIFY_CLIENT_SECRET=9d41f56a37e74949aaf30dde8a2f87e1
SPOTIFY_ACCESS_TOKEN=BQBEXsN91At2hqi1kKKPbe6HBglImz1KignsSp0yv-pSjsgERkE_2XWVqw_QxgB4wvkj0_eBa0S6jyPz3JmWnVWNCOSCWo94Mib0oHwzpCYtcxOHFKs4BXNlHI4uxKrLA5XQ92w1jrI
SPOTIFY_REFRESH_TOKEN=AQAYSt0B-NMWcto_jukhn_eHzaiTh9f3VEB9Y7CYcwjU-5-EQmiUf_hnP4rBtrrOHhK-qIRpvkURMlPs7nIhhpVj1LiW9--TmR7ZpNwOvGdSYg-AFaAhicp0xV8oc6cgSg0
```

### Database Configuration
```
DATABASE_URL=postgresql://postgres.nncmvbfejrsmfaamkhur:nW7ea4yFttpGmF4qV3pY@aws-1-eu-west-2.pooler.supabase.com:6543/postgres
```

### Last.fm Configuration (Optional)
```
LASTFM_API_KEY=7e60d8f2eb056c77142ed17410495d98
LASTFM_USERNAME=chornn
```

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact name and value from above

## Security Notes

⚠️ **IMPORTANT**: 
- These values are from your `.env` file
- The Spotify tokens may expire and need refreshing
- Never share these secrets publicly
- Delete this file after setting up secrets

## Token Refresh

If Spotify tokens expire, refresh them locally:

```bash
cd backend
node scripts/spotifySync.js auth
```

Then update the `SPOTIFY_ACCESS_TOKEN` and `SPOTIFY_REFRESH_TOKEN` secrets in GitHub.

## Testing

After setting up secrets, test the workflow:

1. Go to **Actions** tab in your repository
2. Select **Sync Spotify Plays** workflow  
3. Click **Run workflow**
4. Choose "test" to see what would be synced
5. Check the logs to verify everything works