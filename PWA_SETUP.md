# PWA Setup Guide

Your Music Dashboard is now configured as a Progressive Web App (PWA)! This allows users to install it on their devices and use it like a native app.

## What's Been Added

### 1. Web App Manifest (`/frontend/public/manifest.json`)
- Defines app metadata (name, description, theme colors)
- Specifies app icons for different sizes
- Configures display mode (standalone = full-screen app experience)
- Sets orientation and categorization

### 2. Service Worker (`/frontend/public/sw.js`)
- Enables offline functionality
- Caches static assets for faster loading
- Implements network-first strategy for API calls with cache fallback
- Handles app updates gracefully

### 3. Install Prompt Component (`/frontend/src/components/ui/InstallPrompt.jsx`)
- Shows a friendly banner prompting users to install the app
- Dismissible with 7-day cooldown before showing again
- Only appears when the browser supports PWA installation
- Hidden once the app is already installed

### 4. Service Worker Hook (`/frontend/src/hooks/useServiceWorker.js`)
- Registers the service worker in production
- Handles service worker updates
- Manages version control and cache invalidation

## Required: Generate App Icons

You need to create app icons in various sizes. Place these files in `/frontend/public/`:

### Required Icon Sizes:
- `icon-72x72.png` (72×72px)
- `icon-96x96.png` (96×96px)
- `icon-128x128.png` (128×128px)
- `icon-144x144.png` (144×144px)
- `icon-152x152.png` (152×152px)
- `icon-192x192.png` (192×192px) - **Most important for Android**
- `icon-384x384.png` (384×384px)
- `icon-512x512.png` (512×512px) - **Most important for Android**
- `icon-maskable-192x192.png` (192×192px with safe zone)
- `icon-maskable-512x512.png` (512×512px with safe zone)

### Icon Design Guidelines:
- **Standard icons**: Your logo/design can fill the entire square
- **Maskable icons**: Keep important content within the center 80% (safe zone) as different devices may apply different shapes/masks
- Use PNG format with transparency if needed
- Background color should match your app theme (currently black #000000)

### Quick Icon Generation Options:

**Option 1 - Use an Online Generator:**
1. Create a single 512×512px icon
2. Use a PWA icon generator like:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
3. Upload your icon and download all sizes

**Option 2 - Use ImageMagick (Command Line):**
```bash
cd frontend/public

# Create icons from a source image (replace source.png with your design)
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png

# For maskable icons, you may need to add padding
convert source.png -resize 80% -gravity center -extent 192x192 icon-maskable-192x192.png
convert source.png -resize 80% -gravity center -extent 512x512 icon-maskable-512x512.png
```

**Option 3 - Temporary Placeholder:**
For testing, you can use a solid color placeholder:
```bash
cd frontend/public
# Create simple colored squares (replace with actual icons later)
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:#6366f1 icon-${size}x${size}.png
done
convert -size 192x192 xc:#6366f1 icon-maskable-192x192.png
convert -size 512x512 xc:#6366f1 icon-maskable-512x512.png
```

## Optional: Screenshots

For better installation prompts on some platforms, add screenshots to `/frontend/public/`:

- `screenshot-mobile.png` (390×844px or similar mobile size)
- `screenshot-desktop.png` (1920×1080px or similar desktop size)

These show users what the app looks like before installing.

## Testing Your PWA

### Local Testing (Development):
1. Build the production version:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

2. Open in Chrome/Edge and check:
   - DevTools → Application → Manifest (should show your manifest)
   - DevTools → Application → Service Workers (should be registered)
   - Look for the install button in the address bar

### Production Testing:
1. Deploy your app to a server with HTTPS (required for PWA)
2. Visit on mobile device
3. You should see the install prompt banner
4. After installing, the app appears on your home screen

### Testing Checklist:
- [ ] Icons generated and placed in `/frontend/public/`
- [ ] Manifest loads without errors (check DevTools → Application → Manifest)
- [ ] Service worker registers successfully (check DevTools → Application → Service Workers)
- [ ] Install prompt appears on supported browsers
- [ ] App installs successfully on mobile/desktop
- [ ] App works offline (at least shows cached content)
- [ ] Theme color appears in status bar on mobile

## Browser Support

### Desktop:
- ✅ Chrome/Edge (full support)
- ✅ Firefox (partial - no install prompt)
- ⚠️ Safari (limited PWA features)

### Mobile:
- ✅ Android Chrome (excellent support)
- ✅ Android Edge/Firefox (good support)
- ⚠️ iOS Safari (works but limited - no install banner, must use Share → Add to Home Screen)

## Customization

### Change App Colors:
Edit `/frontend/public/manifest.json`:
```json
{
  "background_color": "#000000",  // Loading screen background
  "theme_color": "#000000"         // Status bar color
}
```

Also update in `/frontend/index.html`:
```html
<meta name="theme-color" content="#000000" />
```

### Change App Name:
Edit `/frontend/public/manifest.json`:
```json
{
  "name": "My Music Dashboard",           // Full name
  "short_name": "Music Dashboard"         // Home screen name (12 chars max recommended)
}
```

### Modify Caching Strategy:
Edit `/frontend/public/sw.js` to change what gets cached and how.

## Troubleshooting

### Install Prompt Doesn't Appear:
- Make sure you're on HTTPS (or localhost)
- Check that manifest is valid (DevTools → Application → Manifest)
- Clear browser data and try again
- Try on a different device/browser

### Service Worker Not Registering:
- Check browser console for errors
- Ensure `/sw.js` is accessible at the root
- Verify HTTPS is enabled (required for service workers)

### Icons Not Showing:
- Verify icon files exist in `/frontend/public/`
- Check browser console for 404 errors
- Ensure icon sizes match manifest definitions
- Try hard refresh (Cmd/Ctrl + Shift + R)

### App Not Working Offline:
- Check service worker is active (DevTools → Application → Service Workers)
- Verify cache is populated (DevTools → Application → Cache Storage)
- Note: First visit requires network; offline works on subsequent visits

## Next Steps

1. **Generate your app icons** using one of the methods above
2. **Test the installation** on your phone
3. **Deploy with HTTPS** (PWAs require HTTPS in production)
4. **Optional**: Add push notifications or other advanced PWA features

## Resources

- [PWA Builder](https://www.pwabuilder.com/) - Tools and validation
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Maskable.app](https://maskable.app/) - Test maskable icons
