#!/usr/bin/env node
/**
 * Injects Vercel environment variables into .env.local for Expo to consume.
 *
 * This script solves the Vercel + Expo integration issue where:
 * 1. Vercel sets env vars in the build environment
 * 2. Expo's babel preset needs to read them from .env files
 * 3. With "framework": null, Vercel doesn't do special env var handling
 *
 * Run this before `expo export` to ensure env vars are available.
 *
 * IMPORTANT: This script will FAIL the build if required env vars are missing.
 */

const fs = require('fs');
const path = require('path');

// Required environment variables - build will fail if these are missing
const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_GCP_PROJECT_NUMBER',
];

// Optional environment variables - will be included if present
const OPTIONAL_ENV_VARS = [
  'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_API_URL',
  'VERCEL_ENV',
  'VERCEL_GIT_PULL_REQUEST_ID',
  'VERCEL_GIT_COMMIT_REF',
  'NODE_ENV',
];

function main() {
  console.log('[inject-env] Starting environment variable injection...');
  console.log('[inject-env] Current environment:', process.env.VERCEL_ENV || 'local');
  console.log('[inject-env] Node environment:', process.env.NODE_ENV || 'not set');

  // Check if we're in a Vercel build environment
  const isVercelBuild = !!process.env.VERCEL;

  if (!isVercelBuild) {
    console.log('[inject-env] Not running in Vercel - skipping injection.');
    console.log('[inject-env] For local development, use .env.local file.');
    return;
  }

  // Validate required environment variables
  const missingVars = [];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('[inject-env] ERROR: Missing required environment variables:');
    for (const varName of missingVars) {
      console.error(`[inject-env]   - ${varName}`);
    }
    console.error('');
    console.error('[inject-env] Please set these variables in Vercel Dashboard:');
    console.error('[inject-env]   Project Settings > Environment Variables');
    console.error('');
    console.error('[inject-env] Make sure to set them for the correct environment:');
    console.error('[inject-env]   - Preview (for staging/PR deployments)');
    console.error('[inject-env]   - Production (for production deployments)');
    process.exit(1);
  }

  // Collect all env vars (required + optional)
  const envVars = {};
  const allVars = [...REQUIRED_ENV_VARS, ...OPTIONAL_ENV_VARS];

  for (const varName of allVars) {
    const value = process.env[varName];
    if (value) {
      envVars[varName] = value;
      // Log variable names (but mask sensitive values)
      const isSensitive = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('ID');
      const displayValue = isSensitive && value.length > 15
        ? value.substring(0, 10) + '...[masked]'
        : value;
      console.log(`[inject-env]   ${varName}=${displayValue}`);
    }
  }

  // Generate .env.local content
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Write to .env.local (this file is gitignored)
  const envPath = path.join(__dirname, '..', '.env.local');
  fs.writeFileSync(envPath, envContent + '\n', 'utf-8');

  console.log(`[inject-env] Written ${Object.keys(envVars).length} variables to .env.local`);
  console.log('[inject-env] Expo build will now pick up these environment variables.');
}

main();
