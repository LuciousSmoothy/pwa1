#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '..', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'icons');

async function generateIcons() {
  console.log('🎨 Generating PWA icons from icon.svg...\n');

  if (!fs.existsSync(inputSvg)) {
    console.error('❌ Error: icon.svg not found in icons/ directory');
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);

    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated icon-${size}.png (${size}x${size})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}.png:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} icons generated successfully, ${errorCount} errors`);

  if (errorCount === 0) {
    console.log('✅ All PWA icons generated successfully!');
  } else {
    console.error('⚠️  Some icons failed to generate. Please check the errors above.');
    process.exit(1);
  }
}

generateIcons().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
