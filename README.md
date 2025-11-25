# Event & Reminder PWA

A Progressive Web Application that demonstrates mobile device feature access including camera, audio recording, geolocation, and calendar integration. Built for learning and exploring PWA capabilities.

## Features

### 📅 Calendar Events
- Create and manage events with title, description, date/time
- Categorize events (Work, Personal, Shopping, Health, Social)
- Export events to device calendar (.ics format)
- Add location data to events
- View all events in a list

### 📍 Location-Based Reminders
- Create reminder lists with multiple items
- Associate reminders with specific locations
- Categorize lists (Grocery, Pharmacy, Hardware Store, Errands)
- Capture current GPS coordinates

### 🎥 Device Features Explorer
- **Camera Access**: Take photos using device camera
- **Audio Recording**: Record and save audio clips
- **Geolocation**: Get precise location data
- **Device Capabilities**: Check what features your device supports

### 📊 Analytics Dashboard
- Track total events and upcoming events
- View events by category with visual breakdown
- Monitor recent activity
- Export all data as JSON for external analysis
- Clear all data option

### 💾 Local Database
- IndexedDB for offline storage (MongoDB-like API)
- All data stored locally on device
- No server required
- Export/import capabilities

## Installation

### Development Setup

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Generate PWA icons (if not already present):

```bash
npm run generate-icons
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser to `http://localhost:8000`

### Production Build

To create a production-ready build optimized for deployment:

```bash
npm run build
```

This will:
- ✅ Minify all JavaScript files (reduces size by ~40%)
- ✅ Remove all console.log statements
- ✅ Update service worker cache version automatically
- ✅ Copy all necessary assets to `./dist` directory
- ✅ Generate build info file

Deploy the contents of the `./dist` directory to your web server.

### Quick Start (No Build)

You can also run the app directly without building:

```bash
# Using the npm script
npm start

# Or using Python 3
python -m http.server 8000

# Or using PHP
php -S localhost:8000
```

### Install as PWA

1. Open the app in a supported browser (Chrome, Edge, Safari, etc.)
2. Look for the "Install App" button in the header
3. Click to install to your home screen
4. Use like a native app!

## Deployment

### Pre-Deployment Checklist

Before deploying to production, ensure:

- ✅ All PWA icons are generated (`npm run generate-icons`)
- ✅ Production build is created (`npm run build`)
- ✅ HTTPS is configured on your web server (required for PWAs)
- ✅ Proper MIME types are set (especially for `.webmanifest` files)
- ✅ Service worker is accessible from root path

### Deployment Steps

1. **Build the production version:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` directory** to your web server:
   - Upload all files from `./dist` to your web root
   - Ensure HTTPS is enabled (required for service workers)
   - Verify manifest.json is accessible

3. **Recommended server configuration:**
   ```nginx
   # Example Nginx configuration
   location /service-worker.js {
     add_header Cache-Control "no-cache, no-store, must-revalidate";
     add_header Pragma "no-cache";
     add_header Expires "0";
   }
   ```

### Deployment Platforms

This PWA can be deployed to:
- **GitHub Pages**: Free HTTPS hosting
- **Netlify**: Automatic deployments from Git
- **Vercel**: Optimized for static sites
- **Firebase Hosting**: Google's static hosting
- **Any static web server** with HTTPS support

### Post-Deployment Verification

1. Open the deployed app in Chrome DevTools
2. Check the **Application** tab → **Manifest**
3. Verify **Service Worker** is registered
4. Test **Add to Home Screen** functionality
5. Confirm **offline mode** works after initial load

## Browser Compatibility

- **Chrome/Edge**: Full support ✓
- **Safari (iOS 11.3+)**: Full support ✓
- **Firefox**: Full support ✓
- **Samsung Internet**: Full support ✓

## PWA Features

- ✅ Offline support via Service Worker
- ✅ Installable to home screen
- ✅ App-like experience in standalone mode
- ✅ Background sync ready
- ✅ Push notification support (framework included)

## Project Structure

```
pwa1/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── app.js                  # Main application logic
├── db.js                   # IndexedDB wrapper
├── styles.css              # Styling
├── package.json            # NPM dependencies and scripts
├── icons/                  # App icons (various sizes)
│   ├── icon.svg           # Source SVG icon
│   ├── icon-*.png         # Generated PNG icons
│   └── generate-icons.html # Browser-based icon generator
├── scripts/                # Build and utility scripts
│   ├── generate-icons.js  # Node script to generate icons
│   └── build.js           # Production build script
├── dist/                   # Production build output (generated)
└── README.md              # This file
```

## How to Use

### Creating an Event

1. Go to the "Events" tab
2. Fill in event details (title, description, dates)
3. Select a category
4. Optionally add current location
5. Click "Save Event" to store locally
6. Click "Add to Device Calendar" to download .ics file

### Creating a Reminder List

1. Go to the "Reminders" tab
2. Enter a list name (e.g., "Grocery Store")
3. Select a category
4. Add items (one per line)
5. Click "Capture Current Location" to save GPS coordinates
6. Click "Save Reminder List"

### Exploring Device Features

1. Go to the "Features" tab
2. Try each feature:
   - **Camera**: Click "Take Picture" → Allow permissions → Click "Capture Photo"
   - **Audio**: Click "Start Recording" → Speak → Click "Stop Recording"
   - **Location**: Click "Get Current Location" to see GPS data
   - **Capabilities**: Automatically shows what your device supports

### Viewing Analytics

1. Go to the "Analytics" tab
2. View statistics about your events and reminders
3. See category breakdown charts
4. Review recent activity log
5. Export data as JSON or clear all data

## Technical Details

### IndexedDB Schema

- **events**: Stores calendar events
- **reminders**: Stores location-based reminder lists
- **media**: Stores captured photos and audio
- **activity**: Logs user actions for analytics

### Service Worker

- Caches app files for offline use
- Network-first strategy for dynamic content
- Cache-first for static assets
- Automatic cache versioning

### Device APIs Used

- Media Devices API (Camera/Microphone)
- Geolocation API
- MediaRecorder API
- IndexedDB
- Service Worker API
- Web App Manifest
- Vibration API (if available)

## Future Enhancements

- [ ] Push notifications for upcoming events
- [ ] Background sync for calendar updates
- [ ] Import events from calendar
- [ ] Share functionality
- [ ] Dark mode
- [ ] Multiple languages
- [ ] Cloud backup option
- [ ] Proximity alerts for location-based reminders

## Privacy

All data is stored locally on your device using IndexedDB. No data is sent to any server. The app works completely offline after the initial load.

## License

MIT License - Feel free to use and modify for learning purposes!

## Support

This is a learning project demonstrating PWA capabilities. For issues or questions, please refer to the documentation or create an issue in the repository.

## Credits

Built with vanilla JavaScript, HTML5, and CSS3. No frameworks required!
