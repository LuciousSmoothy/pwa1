# Deployment Guide

This guide provides detailed instructions for deploying the Event & Reminder PWA to production.

## Prerequisites

- Node.js 14+ installed
- npm or yarn package manager
- A web hosting service with HTTPS support (required for PWAs)

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Icons

If icons haven't been generated yet:

```bash
npm run generate-icons
```

This creates all required PNG icons (72x72 to 512x512) from the source SVG.

### 3. Create Production Build

```bash
npm run build
```

The build process will:
- Minify JavaScript files (~40% size reduction)
- Remove all console.log statements
- Update service worker cache version
- Copy all assets to `./dist` directory
- Generate build metadata

**Build Output:**
```
dist/
├── index.html
├── manifest.json
├── service-worker.js    # Minified, no console logs
├── app.js               # Minified, ~41KB (from 63KB)
├── db.js                # Minified, ~5KB (from 10KB)
├── styles.css
├── icons/               # All PNG icons
└── build-info.json      # Build metadata
```

## Deployment Options

### Option 1: GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Create a `gh-pages` branch:
   ```bash
   git checkout -b gh-pages
   ```

3. Copy dist contents to root:
   ```bash
   cp -r dist/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

4. Enable GitHub Pages in repository settings (select `gh-pages` branch)

### Option 2: Netlify

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Deploy via Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

Or use drag-and-drop deployment:
- Go to https://app.netlify.com/drop
- Drag the `dist` folder to the upload area

### Option 3: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   npm run build
   vercel --prod
   ```

3. When prompted, set:
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Option 4: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase:
   ```bash
   firebase init hosting
   ```

3. Configure:
   - Public directory: `dist`
   - Single-page app: No
   - Automatic builds: No

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

### Option 5: Traditional Web Server

1. Build the project:
   ```bash
   npm run build
   ```

2. Upload `dist` directory contents to your web server root via:
   - FTP/SFTP
   - rsync
   - Git pull on server
   - SSH/SCP

3. Ensure HTTPS is configured (required for PWAs)

## Server Configuration

### Nginx

Add to your nginx configuration:

```nginx
# PWA Event & Reminder App
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration (required for PWAs)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/html;
    index index.html;

    # Service Worker - Never cache
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest
    location /manifest.json {
        add_header Content-Type "application/manifest+json";
        add_header Cache-Control "public, max-age=604800";
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS (required for PWAs)
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Apache (.htaccess)

Create `.htaccess` in your dist directory:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Service Worker - Never cache
<Files "service-worker.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</Files>

# Manifest
<Files "manifest.json">
    Header set Content-Type "application/manifest+json"
</Files>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType text/css "access plus 1 week"
    ExpiresByType application/javascript "access plus 1 week"
</IfModule>
```

## Post-Deployment Checklist

After deploying, verify:

### 1. HTTPS is Working
- Open your site in a browser
- Verify the URL shows `https://` and a lock icon
- Check SSL certificate is valid

### 2. PWA Manifest is Valid
- Open Chrome DevTools → Application → Manifest
- Verify all icons are loaded
- Check manifest properties are correct

### 3. Service Worker is Registered
- Open Chrome DevTools → Application → Service Workers
- Verify service worker is "activated and running"
- Check cache storage contains expected files

### 4. Install Prompt Works
- On mobile: Look for browser's "Add to Home Screen" prompt
- On desktop: Click install button in address bar (Chrome/Edge)
- Install the app and test it works standalone

### 5. Offline Functionality
- Open the app and let it fully load
- Turn off network (DevTools → Network → Offline)
- Refresh the page - it should still load
- Test creating events/reminders offline

### 6. Lighthouse PWA Audit
Run Lighthouse in Chrome DevTools:
```
DevTools → Lighthouse → Categories: Progressive Web App → Analyze
```

Target score: **90+**

### 7. Test on Real Devices
- iOS Safari (iPhone/iPad)
- Android Chrome
- Android Samsung Internet
- Desktop Chrome/Edge
- Desktop Firefox

## Troubleshooting

### Service Worker Not Registering
- Verify HTTPS is enabled
- Check `service-worker.js` is accessible at root path
- Clear browser cache and hard refresh (Ctrl+Shift+R)

### Icons Not Showing
- Verify all icon-*.png files are in the icons/ directory
- Check manifest.json paths are correct
- Run `npm run generate-icons` if icons are missing

### App Not Installing
- Ensure all PWA criteria are met (HTTPS, manifest, service worker)
- Check manifest.json has required fields (name, icons, start_url)
- Verify at least 192x192 and 512x512 icons exist

### Cache Not Updating
- Service worker cache name includes a timestamp
- Update is automatic on rebuild
- Users may need to close all tabs for update to apply

### Console Errors in Production
- Verify you deployed from `dist` directory (not root)
- Check file paths in index.html are correct
- Ensure manifest.json is valid JSON

## Performance Tips

1. **Enable Compression**: Configure gzip/brotli on your server
2. **Use CDN**: Consider Cloudflare or similar for global delivery
3. **Monitor Performance**: Use Lighthouse and Web Vitals
4. **Cache Strategy**: The app uses cache-first for assets
5. **Regular Updates**: Rebuild to get latest cache version

## Security Considerations

1. **HTTPS Only**: Required for PWAs, enforced by browsers
2. **Content Security Policy**: Consider adding CSP headers
3. **No External Dependencies**: App has no external CDN dependencies
4. **Local Data Only**: All data stored in IndexedDB (client-side)
5. **No Tracking**: No analytics or tracking by default

## Monitoring

Consider adding:
- Error tracking (Sentry, Rollbar)
- Analytics (Google Analytics, Plausible)
- Performance monitoring (Web Vitals)
- Uptime monitoring (UptimeRobot, Pingdom)

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PWA

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Generate icons
      run: npm run generate-icons

    - name: Build
      run: npm run build

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

## Support

For deployment issues:
1. Check browser console for errors
2. Verify network tab for failed requests
3. Run Lighthouse PWA audit
4. Test in incognito/private mode
5. Check server logs for errors

## License

MIT License - Deploy anywhere!
