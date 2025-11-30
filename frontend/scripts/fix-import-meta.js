#!/usr/bin/env node

/**
 * Post-build script to fix import.meta in bundled JavaScript
 *
 * This script replaces import.meta.env references with process.env
 * to work around Expo Web's lack of ESM support.
 *
 * See: https://github.com/expo/expo/issues/30323
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const distDir = path.join(__dirname, '..', 'dist', '_expo', 'static', 'js', 'web');

// Find all JS bundles
const files = glob.sync(path.join(distDir, '*.js'));

console.log(`\n🔧 Fixing import.meta in ${files.length} bundle(s)...\n`);

let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // Replace import.meta.env?.MODE with process.env.NODE_ENV
  content = content.replace(
    /import\.meta\.env\s*\?\s*import\.meta\.env\.MODE\s*:\s*void\s+0/g,
    'process.env.NODE_ENV'
  );

  // Replace any remaining import.meta.env.MODE
  content = content.replace(
    /import\.meta\.env\.MODE/g,
    'process.env.NODE_ENV'
  );

  // Replace any remaining import.meta.env
  content = content.replace(
    /import\.meta\.env/g,
    'process.env'
  );

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    const count = (originalContent.match(/import\.meta/g) || []).length;
    totalReplacements += count;
    console.log(`  ✅ ${path.basename(file)}: Replaced ${count} occurrence(s)`);
  }
});

console.log(`\n✨ Done! Replaced ${totalReplacements} import.meta reference(s)\n`);
