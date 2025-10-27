# Quick Start Guide

## Getting Started in 3 Steps

### 1. Start the Server

Choose one method:

**Option A - Using npm (recommended):**
```bash
npm install
npm start
```

**Option B - Using Python:**
```bash
python -m http.server 8000
```

**Option C - Using Node.js directly:**
```bash
npx http-server -p 8000
```

### 2. Open in Browser

Navigate to: `http://localhost:8000`

**Important:** Use `localhost` or HTTPS for full PWA features. Many device APIs require a secure context.

### 3. Install as App (Optional)

1. Look for the install button in the app header
2. Or use browser menu: "Install App" or "Add to Home Screen"
3. Enjoy the app-like experience!

## First Time Setup

### Generate Icons (Optional)

The app will work without custom icons, but to create proper ones:

1. Open `generate-icons.html` in your browser
2. Download all generated icon files
3. Move them to the `/icons/` folder

Or create your own 192x192 and 512x512 PNG icons.

## Testing Features

### Test Calendar Events
1. Click "Events" tab
2. Fill in the form
3. Click "Save Event"
4. See your event appear below

### Test Location Reminders
1. Click "Reminders" tab
2. Enter a list name (e.g., "Grocery List")
3. Add items (one per line)
4. Click "Capture Current Location" (allow permissions)
5. Save the list

### Test Device Features
1. Click "Features" tab
2. Try camera, audio, or location
3. Grant permissions when prompted

### View Analytics
1. Click "Analytics" tab
2. See your data statistics
3. Export data as JSON if needed

## Troubleshooting

### Camera/Microphone Not Working
- Ensure you're using HTTPS or localhost
- Check browser permissions
- Try a different browser

### Location Not Working
- Allow location permissions
- Ensure GPS is enabled
- May not work in incognito mode

### App Won't Install
- Must use HTTPS or localhost
- Check manifest.json is loading
- Try Chrome/Edge for best support

### Service Worker Issues
- Clear browser cache
- Unregister old service workers
- Hard refresh (Ctrl+Shift+R)

## Browser DevTools Tips

### Check PWA Status
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" and "Service Workers"

### View Storage
1. Application → Storage
2. IndexedDB → EventPWA
3. See all your stored data

### Test Offline
1. Application → Service Workers
2. Check "Offline" checkbox
3. Reload page - should still work!

## Next Steps

- Create your first event
- Try location-based reminders
- Explore device features
- Check out the analytics
- Install as PWA on mobile device

Enjoy exploring your new PWA! 🚀
