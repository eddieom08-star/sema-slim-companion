#!/usr/bin/env node

/**
 * Watch for file changes and automatically rebuild + sync to iOS
 *
 * Usage: npm run mobile:watch
 */

const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

let isBuilding = false;
let pendingRebuild = false;

const clientSrcPath = path.join(__dirname, '../client/src');

console.log('🔍 Watching for changes in client/src...\n');

function buildAndSync() {
  if (isBuilding) {
    pendingRebuild = true;
    console.log('⏳ Build in progress, queuing next build...\n');
    return;
  }

  isBuilding = true;
  console.log('🔨 Building and syncing to iOS...\n');

  const build = spawn('npm', ['run', 'mobile:sync:ios'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, LANG: 'en_US.UTF-8' }
  });

  build.on('close', (code) => {
    isBuilding = false;

    if (code === 0) {
      console.log('\n✅ Build complete! Ready for testing.\n');

      if (pendingRebuild) {
        pendingRebuild = false;
        console.log('🔄 Starting queued build...\n');
        buildAndSync();
      }
    } else {
      console.error(`\n❌ Build failed with code ${code}\n`);
    }
  });
}

// Watch for changes
const watcher = chokidar.watch(clientSrcPath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

watcher
  .on('change', (filePath) => {
    console.log(`📝 File changed: ${path.relative(process.cwd(), filePath)}`);
    buildAndSync();
  })
  .on('add', (filePath) => {
    console.log(`➕ File added: ${path.relative(process.cwd(), filePath)}`);
    buildAndSync();
  })
  .on('unlink', (filePath) => {
    console.log(`➖ File removed: ${path.relative(process.cwd(), filePath)}`);
    buildAndSync();
  });

console.log('👀 Watching client/src for changes...');
console.log('Press Ctrl+C to stop\n');

// Initial build
buildAndSync();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping watcher...');
  watcher.close();
  process.exit(0);
});
