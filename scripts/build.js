#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const sourceFiles = [
  { input: 'app.js', output: 'dist/app.js' },
  { input: 'db.js', output: 'dist/db.js' },
  { input: 'service-worker.js', output: 'dist/service-worker.js' }
];

const staticFiles = [
  'index.html',
  'manifest.json',
  'styles.css'
];

const directories = [
  'icons'
];

async function cleanDist() {
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });
}

async function minifyJavaScript(inputPath, outputPath) {
  const code = fs.readFileSync(inputPath, 'utf8');

  const options = {
    compress: {
      drop_console: true, // Remove console.log, console.error, etc.
      drop_debugger: true,
      dead_code: true,
      unused: true
    },
    mangle: false, // Don't mangle names for better debugging in production
    format: {
      comments: false // Remove comments
    }
  };

  const result = await minify(code, options);

  if (result.error) {
    throw result.error;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputPath, result.code, 'utf8');

  const originalSize = (code.length / 1024).toFixed(2);
  const minifiedSize = (result.code.length / 1024).toFixed(2);
  const savings = (((code.length - result.code.length) / code.length) * 100).toFixed(1);

  return { originalSize, minifiedSize, savings };
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function build() {
  console.log('🚀 Building production version...\n');

  const rootDir = path.join(__dirname, '..');

  try {
    // Step 1: Clean dist directory
    console.log('📁 Cleaning dist directory...');
    await cleanDist();
    console.log('✅ Cleaned\n');

    // Step 2: Minify JavaScript files
    console.log('📦 Minifying JavaScript files...');
    for (const file of sourceFiles) {
      const inputPath = path.join(rootDir, file.input);
      const outputPath = path.join(rootDir, file.output);

      const { originalSize, minifiedSize, savings } = await minifyJavaScript(inputPath, outputPath);
      console.log(`✅ ${file.input}: ${originalSize}KB → ${minifiedSize}KB (${savings}% reduction)`);
    }
    console.log('');

    // Step 3: Copy static files
    console.log('📄 Copying static files...');
    for (const file of staticFiles) {
      const src = path.join(rootDir, file);
      const dest = path.join(rootDir, 'dist', file);
      copyFile(src, dest);
      console.log(`✅ Copied ${file}`);
    }
    console.log('');

    // Step 4: Copy directories
    console.log('📂 Copying directories...');
    for (const dir of directories) {
      const src = path.join(rootDir, dir);
      const dest = path.join(rootDir, 'dist', dir);
      if (fs.existsSync(src)) {
        copyDirectory(src, dest);
        console.log(`✅ Copied ${dir}/`);
      }
    }
    console.log('');

    // Step 5: Update service worker cache version
    const swPath = path.join(rootDir, 'dist', 'service-worker.js');
    let swContent = fs.readFileSync(swPath, 'utf8');
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const newCacheName = `event-pwa-v${timestamp}`;

    // Look for cache name pattern and update it
    swContent = swContent.replace(/event-pwa-v\d+/g, newCacheName);
    fs.writeFileSync(swPath, swContent, 'utf8');
    console.log(`🔄 Updated service worker cache version to: ${newCacheName}\n`);

    // Step 6: Create a production info file
    const buildInfo = {
      buildDate: new Date().toISOString(),
      version: newCacheName,
      environment: 'production'
    };
    fs.writeFileSync(
      path.join(rootDir, 'dist', 'build-info.json'),
      JSON.stringify(buildInfo, null, 2),
      'utf8'
    );

    console.log('✅ Production build completed successfully!');
    console.log('\n📦 Build output is in the ./dist directory');
    console.log('💡 Deploy the contents of ./dist to your web server');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
