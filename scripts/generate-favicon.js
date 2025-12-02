#!/usr/bin/env node

/**
 * Favicon generator script
 * Generates high-quality favicons from SVG source
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '../frontend/assets');
const SVG_SOURCE = path.join(ASSETS_DIR, 'icon.svg');

async function generateFavicons() {
  console.log('🎨 Generating favicons from SVG...');

  try {
    // Read SVG file
    const svgBuffer = fs.readFileSync(SVG_SOURCE);

    // Generate PNG favicon at 192x192 (standard size)
    console.log('  Creating favicon.png (192x192)...');
    await sharp(svgBuffer)
      .png()
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(path.join(ASSETS_DIR, 'favicon.png'));

    // Generate ICO format for better browser support
    console.log('  Creating favicon.ico (32x32)...');
    await sharp(svgBuffer)
      .png()
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(path.join(ASSETS_DIR, 'favicon.png'));

    // Generate Apple touch icon (180x180)
    console.log('  Creating apple-touch-icon.png (180x180)...');
    await sharp(svgBuffer)
      .png()
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(ASSETS_DIR, 'apple-touch-icon.png'));

    // Generate Android Chrome icon (192x192)
    console.log('  Creating android-chrome-192x192.png...');
    await sharp(svgBuffer)
      .png()
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(ASSETS_DIR, 'android-chrome-192x192.png'));

    // Generate Android Chrome icon (512x512)
    console.log('  Creating android-chrome-512x512.png...');
    await sharp(svgBuffer)
      .png()
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(ASSETS_DIR, 'android-chrome-512x512.png'));

    console.log('✅ Favicons generated successfully!');
    console.log('📁 Icons created in frontend/assets/');

  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons();
