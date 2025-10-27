# PWA Icons

This folder should contain the following icon sizes for the PWA to work properly:

- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192) - Required for PWA
- icon-384.png (384x384)
- icon-512.png (512x512) - Required for PWA

## How to Generate Icons

### Option 1: Use the Generator (Easiest)
1. Open `generate-icons.html` in your browser
2. The script will automatically download all required icon sizes
3. Move the downloaded files to this folder

### Option 2: Online Tools
Use online icon generators like:
- https://www.pwabuilder.com/imageGenerator
- https://realfavicongenerator.net/

Upload a 512x512 source image and download the generated pack.

### Option 3: Manual Creation
Create PNG files manually using any image editor (Photoshop, GIMP, Figma, etc.)

## Temporary Solution

The app currently includes `icon.svg` which will work as a fallback, but PNG icons are recommended for best compatibility across all devices.

## Note on Maskable Icons

For better appearance on Android, consider creating "maskable" icons with safe zones. The icon content should stay within the center 80% of the canvas.
