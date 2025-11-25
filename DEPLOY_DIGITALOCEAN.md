# Digital Ocean Deployment Guide

Complete step-by-step guide to deploy the Event & Reminder PWA on a Digital Ocean droplet.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Digital Ocean Droplet](#step-1-create-digital-ocean-droplet)
3. [Step 2: Initial Server Setup](#step-2-initial-server-setup)
4. [Step 3: Install Required Software](#step-3-install-required-software)
5. [Step 4: Configure Nginx](#step-4-configure-nginx)
6. [Step 5: Setup SSL with Let's Encrypt](#step-5-setup-ssl-with-lets-encrypt)
7. [Step 6: Deploy the Application](#step-6-deploy-the-application)
8. [Step 7: Configure PWA-Specific Settings](#step-7-configure-pwa-specific-settings)
9. [Step 8: Verification & Testing](#step-8-verification--testing)
10. [Step 9: Maintenance & Updates](#step-9-maintenance--updates)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Digital Ocean account ([Sign up here](https://www.digitalocean.com/))
- ✅ Domain name (or subdomain) pointing to your droplet
- ✅ SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- ✅ Git installed on your local machine
- ✅ This repository cloned locally

**Estimated Time:** 30-45 minutes
**Estimated Cost:** $6-12/month (Basic Droplet)

---

## Step 1: Create Digital Ocean Droplet

### 1.1 Log into Digital Ocean

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com/)
2. Click **"Create"** → **"Droplets"**

### 1.2 Configure Droplet

**Choose an image:**
- Select **Ubuntu 22.04 (LTS) x64** (recommended)

**Choose Size:**
- **Basic Plan** - $6/month
- **Regular** - 1 GB RAM / 1 vCPU / 25 GB SSD
- (This is sufficient for a PWA with low-to-medium traffic)

**Choose a datacenter region:**
- Select the region closest to your users
- Example: New York, San Francisco, London, etc.

**Authentication:**
- **Option A (Recommended):** SSH Keys
  - Click "New SSH Key"
  - Paste your public key (generate with `ssh-keygen` if needed)
- **Option B:** Password (less secure)

**Choose a hostname:**
- Example: `event-pwa-production`

**Finalize and create:**
- Click **"Create Droplet"**
- Wait 30-60 seconds for provisioning

### 1.3 Note Your Droplet IP

Once created, copy your droplet's IP address:
```
Example: 143.198.123.456
```

---

## Step 2: Initial Server Setup

### 2.1 Connect to Your Droplet

```bash
# Replace YOUR_IP with your droplet's IP address
ssh root@YOUR_IP
```

If using SSH key, you'll connect automatically.
If using password, enter the password sent to your email.

### 2.2 Update System Packages

```bash
# Update package lists
apt update

# Upgrade installed packages
apt upgrade -y
```

### 2.3 Create a Non-Root User (Security Best Practice)

```bash
# Create new user (replace 'deployer' with your preferred username)
adduser deployer

# Add user to sudo group
usermod -aG sudo deployer

# Setup SSH for new user
rsync --archive --chown=deployer:deployer ~/.ssh /home/deployer
```

### 2.4 Configure Firewall

```bash
# Allow SSH
ufw allow OpenSSH

# Allow HTTP (port 80)
ufw allow 'Nginx HTTP'

# Allow HTTPS (port 443)
ufw allow 'Nginx HTTPS'

# Enable firewall
ufw enable

# Verify status
ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx HTTP                 ALLOW       Anywhere
Nginx HTTPS                ALLOW       Anywhere
```

### 2.5 Switch to New User

```bash
# Exit root session
exit

# Reconnect as new user
ssh deployer@YOUR_IP
```

---

## Step 3: Install Required Software

### 3.1 Install Nginx

```bash
# Install Nginx web server
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

You should see `active (running)` in green.

### 3.2 Install Node.js (for building the app)

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 3.3 Install Git

```bash
# Install Git
sudo apt install git -y

# Verify installation
git --version
```

### 3.4 Install Certbot (for SSL certificates)

```bash
# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Verify installation
certbot --version
```

---

## Step 4: Configure Nginx

### 4.1 Create Website Directory

```bash
# Create directory for your application
sudo mkdir -p /var/www/event-pwa

# Set ownership to your user
sudo chown -R $USER:$USER /var/www/event-pwa

# Set proper permissions
sudo chmod -R 755 /var/www
```

### 4.2 Create Nginx Configuration

```bash
# Create new Nginx site configuration
sudo nano /etc/nginx/sites-available/event-pwa
```

**Paste the following configuration** (replace `your-domain.com` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name your-domain.com www.your-domain.com;

    root /var/www/event-pwa;
    index index.html;

    # Logs
    access_log /var/log/nginx/event-pwa-access.log;
    error_log /var/log/nginx/event-pwa-error.log;

    # Service Worker - NEVER cache
    location = /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri =404;
    }

    # Manifest file
    location = /manifest.json {
        add_header Content-Type "application/manifest+json";
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Main location block
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/javascript
               application/xml+rss application/json;
}
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### 4.3 Enable the Site

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/event-pwa /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

Expected output:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4.4 Reload Nginx

```bash
sudo systemctl reload nginx
```

---

## Step 5: Setup SSL with Let's Encrypt

**Important:** Your domain must be pointing to your droplet's IP before this step.

### 5.1 Configure DNS

Before proceeding, set up DNS records:

**A Record:**
```
Type: A
Name: @ (or your subdomain)
Value: YOUR_DROPLET_IP
TTL: 3600
```

**Optional - www subdomain:**
```
Type: A
Name: www
Value: YOUR_DROPLET_IP
TTL: 3600
```

Wait 5-10 minutes for DNS propagation. Verify with:
```bash
dig your-domain.com +short
# Should return your droplet IP
```

### 5.2 Obtain SSL Certificate

```bash
# Run Certbot with Nginx plugin
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Follow the prompts:**
1. Enter your email address (for renewal notifications)
2. Agree to Terms of Service (Y)
3. Choose whether to share email (optional)
4. Select option 2: Redirect HTTP to HTTPS (recommended)

Certbot will:
- Obtain SSL certificate
- Configure Nginx automatically
- Setup auto-renewal

### 5.3 Verify Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run
```

If successful, you'll see: `Congratulations, all simulated renewals succeeded`

### 5.4 Verify SSL Configuration

```bash
# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 6: Deploy the Application

### 6.1 Clone Repository on Server

```bash
# Navigate to home directory
cd ~

# Clone your repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/pwa1.git

# Navigate into repository
cd pwa1
```

### 6.2 Install Dependencies

```bash
# Install npm packages
npm install
```

### 6.3 Generate Icons (if not already in repo)

```bash
# Generate PWA icons
npm run generate-icons
```

### 6.4 Build Production Version

```bash
# Create production build
npm run build
```

Expected output:
```
🚀 Building production version...
✅ Production build completed successfully!
```

### 6.5 Deploy to Web Root

```bash
# Remove any existing files in web root
sudo rm -rf /var/www/event-pwa/*

# Copy production build to web root
sudo cp -r dist/* /var/www/event-pwa/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/event-pwa
sudo chmod -R 755 /var/www/event-pwa
```

### 6.6 Verify Files

```bash
# List deployed files
ls -la /var/www/event-pwa/
```

You should see:
- index.html
- app.js
- db.js
- service-worker.js
- manifest.json
- styles.css
- icons/ (directory)
- build-info.json

---

## Step 7: Configure PWA-Specific Settings

### 7.1 Update Manifest for Your Domain

```bash
# Edit manifest.json
sudo nano /var/www/event-pwa/manifest.json
```

Update the `start_url` field:
```json
{
  "name": "Event & Reminder PWA",
  "short_name": "Event PWA",
  "start_url": "/",
  "scope": "/",
  ...
}
```

Save and exit (Ctrl+X, Y, Enter).

### 7.2 Verify Service Worker Registration

The service worker should automatically register. Verify by checking:
```bash
curl https://your-domain.com/service-worker.js
```

Should return minified JavaScript code.

### 7.3 Add Security Headers (Enhanced)

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/event-pwa
```

Add inside the `server` block (if not already present):
```nginx
    # Enhanced security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(self), camera=(self), microphone=(self)" always;
```

Save, test, and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: Verification & Testing

### 8.1 Test Website Access

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://your-domain.com

# Test HTTPS
curl -I https://your-domain.com
```

### 8.2 Browser Testing Checklist

Open your site in multiple browsers:

**Chrome/Edge:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** - should show all icons
4. Check **Service Workers** - should be "activated and running"
5. Test **Add to Home Screen** from address bar
6. Go to **Network** tab, enable **Offline**, reload page - should still work

**Firefox:**
1. Open Developer Tools (F12)
2. Go to **Storage** → **Service Workers**
3. Verify service worker is registered

**Safari (iOS):**
1. Open the site on iPhone/iPad
2. Tap Share button
3. Look for "Add to Home Screen"
4. Install and test as standalone app

### 8.3 Lighthouse PWA Audit

1. Open site in Chrome
2. Open DevTools (F12)
3. Go to **Lighthouse** tab
4. Select **Progressive Web App** category
5. Click **Analyze page load**

**Target Scores:**
- Progressive Web App: 90+ ✓
- Performance: 90+ ✓
- Accessibility: 90+ ✓
- Best Practices: 90+ ✓
- SEO: 90+ ✓

### 8.4 SSL Testing

Test your SSL configuration:
```bash
# Using SSL Labs (visit in browser)
https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

Target Grade: **A** or **A+**

### 8.5 PWA Feature Testing

Test all PWA features:
- ✅ Offline functionality (disconnect, reload page)
- ✅ Install prompt appears
- ✅ App installs to home screen
- ✅ Standalone mode works (no browser chrome)
- ✅ Icons display correctly in app switcher
- ✅ Camera permission works (HTTPS required)
- ✅ Geolocation works (HTTPS required)
- ✅ Audio recording works (HTTPS required)

---

## Step 9: Maintenance & Updates

### 9.1 Deploy Updates

When you make changes to the app:

```bash
# SSH into your droplet
ssh deployer@YOUR_IP

# Navigate to repository
cd ~/pwa1

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild production version
npm run build

# Deploy to web root
sudo rm -rf /var/www/event-pwa/*
sudo cp -r dist/* /var/www/event-pwa/
sudo chown -R www-data:www-data /var/www/event-pwa
sudo chmod -R 755 /var/www/event-pwa

# Clear service worker cache on client devices automatically happens
# due to the timestamped cache version in service-worker.js
```

### 9.2 Automated Deployment Script

Create a deployment script for easier updates:

```bash
# Create deployment script
nano ~/deploy-pwa.sh
```

**Paste the following:**
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to repository
cd ~/pwa1

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build production version
echo "🔨 Building production version..."
npm run build

# Deploy to web root
echo "📤 Deploying to web root..."
sudo rm -rf /var/www/event-pwa/*
sudo cp -r dist/* /var/www/event-pwa/
sudo chown -R www-data:www-data /var/www/event-pwa
sudo chmod -R 755 /var/www/event-pwa

echo "✅ Deployment complete!"
echo "🌐 Visit: https://your-domain.com"
```

**Make executable:**
```bash
chmod +x ~/deploy-pwa.sh
```

**Use it:**
```bash
~/deploy-pwa.sh
```

### 9.3 Monitor Server Resources

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/event-pwa-error.log

# View Nginx access logs
sudo tail -f /var/log/nginx/event-pwa-access.log
```

### 9.4 SSL Certificate Renewal

Certbot automatically renews certificates. To manually renew:

```bash
# Renew certificates
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

### 9.5 Backup Strategy

```bash
# Create backup script
nano ~/backup-pwa.sh
```

**Paste:**
```bash
#!/bin/bash

BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/pwa-$DATE.tar.gz /var/www/event-pwa

# Backup Nginx config
sudo cp /etc/nginx/sites-available/event-pwa $BACKUP_DIR/nginx-config-$DATE

echo "✅ Backup completed: $BACKUP_DIR/pwa-$DATE.tar.gz"
```

**Make executable and run:**
```bash
chmod +x ~/backup-pwa.sh
~/backup-pwa.sh
```

---

## Troubleshooting

### Issue: Cannot Access Website

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

**Check Firewall:**
```bash
sudo ufw status
sudo ufw allow 'Nginx Full'
```

**Check DNS:**
```bash
dig your-domain.com +short
# Should return your droplet IP
```

### Issue: Service Worker Not Registering

**Check HTTPS:**
- Service workers ONLY work over HTTPS
- Visit `https://your-domain.com` (not `http://`)

**Check Console:**
- Open browser DevTools → Console
- Look for service worker errors

**Clear Cache:**
```bash
# On server
sudo rm -rf /var/www/event-pwa/service-worker.js
sudo cp ~/pwa1/dist/service-worker.js /var/www/event-pwa/
```

### Issue: Icons Not Displaying

**Verify icons exist:**
```bash
ls -la /var/www/event-pwa/icons/
```

**Check manifest.json:**
```bash
cat /var/www/event-pwa/manifest.json | grep -A 10 '"icons"'
```

**Regenerate icons:**
```bash
cd ~/pwa1
npm run generate-icons
npm run build
# Redeploy
```

### Issue: SSL Certificate Problems

**Check certificate status:**
```bash
sudo certbot certificates
```

**Renew certificate:**
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Issue: High Memory Usage

**Check processes:**
```bash
top
# Press 'M' to sort by memory
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

**Upgrade droplet** if consistently running out of memory.

### Issue: Slow Performance

**Enable caching** (check Nginx config has cache headers)

**Enable Gzip compression** (should already be enabled)

**Use CDN:**
- Consider Cloudflare (free tier available)
- Point domain to Cloudflare
- Enable caching and CDN features

### Getting Help

**Check Logs:**
```bash
# Nginx access log
sudo tail -100 /var/log/nginx/event-pwa-access.log

# Nginx error log
sudo tail -100 /var/log/nginx/event-pwa-error.log

# System log
sudo journalctl -xe
```

**Test from command line:**
```bash
curl -I https://your-domain.com
curl https://your-domain.com/service-worker.js
curl https://your-domain.com/manifest.json
```

---

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Monitor logs regularly:**
   ```bash
   sudo tail -f /var/log/nginx/event-pwa-access.log
   ```

3. **Use strong passwords** for all accounts

4. **Enable automatic security updates:**
   ```bash
   sudo apt install unattended-upgrades -y
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

5. **Consider fail2ban** to prevent brute force attacks:
   ```bash
   sudo apt install fail2ban -y
   ```

6. **Regular backups** - Run backup script weekly

---

## Cost Optimization

**Basic Droplet ($6/month):**
- Good for 1,000-5,000 users/month
- ~50GB monthly transfer

**If you need more:**
- Upgrade to $12/month droplet (2GB RAM)
- Add Cloudflare CDN (free) for better caching
- Use Digital Ocean Spaces (object storage) for media

**Monthly Cost Breakdown:**
- Droplet: $6-12/month
- Domain: $10-15/year (~$1/month)
- SSL: Free (Let's Encrypt)
- **Total: ~$7-13/month**

---

## Next Steps

🎉 **Congratulations!** Your PWA is now live on Digital Ocean.

**Share your app:**
- Test on multiple devices
- Share URL with users
- Monitor performance with Lighthouse
- Gather user feedback

**Enhance your deployment:**
- Set up monitoring (UptimeRobot, Pingdom)
- Add analytics (Google Analytics, Plausible)
- Configure backups (automated)
- Set up staging environment

**Questions or Issues?**
- Check the [main DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review [README.md](./README.md) for app features
- Check Digital Ocean documentation
- Review Nginx documentation

---

## Quick Reference Commands

```bash
# Deploy updates
~/deploy-pwa.sh

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx config
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/event-pwa-error.log

# Renew SSL
sudo certbot renew

# Backup
~/backup-pwa.sh

# Check disk space
df -h

# Check memory
free -h
```

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Tested On:** Ubuntu 22.04 LTS, Nginx 1.18+, Node.js 18.x
