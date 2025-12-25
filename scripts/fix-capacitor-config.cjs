#!/usr/bin/env node

/**
 * Post-sync hook to restore ClerkPlugin to packageClassList
 *
 * Problem: npx cap sync ios clears packageClassList in ios/App/App/capacitor.config.json
 * Solution: Automatically restore ClerkPlugin after sync completes
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../ios/App/App/capacitor.config.json');

const REQUIRED_PLUGINS = [
  'AppPlugin',
  'CAPBrowserPlugin',
  'KeyboardPlugin',
  'CAPNetworkPlugin',
  'PreferencesPlugin',
  'SplashScreenPlugin',
  'StatusBarPlugin',
  'ClerkPlugin'
];

try {
  console.log('[fix-capacitor-config] Reading capacitor.config.json...');

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  // Check if packageClassList is empty or missing ClerkPlugin
  const currentPlugins = config.packageClassList || [];
  const hasClerkPlugin = currentPlugins.includes('ClerkPlugin');

  if (!hasClerkPlugin || currentPlugins.length === 0) {
    console.log('[fix-capacitor-config] packageClassList is empty or missing ClerkPlugin');
    console.log('[fix-capacitor-config] Restoring plugins:', REQUIRED_PLUGINS.join(', '));

    config.packageClassList = REQUIRED_PLUGINS;

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, '\t'));

    console.log('[fix-capacitor-config] ✓ ClerkPlugin restored to packageClassList');
  } else {
    console.log('[fix-capacitor-config] ✓ ClerkPlugin already present in packageClassList');
  }
} catch (error) {
  console.error('[fix-capacitor-config] Error:', error.message);
  process.exit(1);
}
