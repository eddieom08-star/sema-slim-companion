#!/usr/bin/env node

const xcode = require('xcode');
const fs = require('fs');
const path = require('path');

const projectPath = path.join(__dirname, 'ios/App/App.xcodeproj/project.pbxproj');
const clerkPluginPath = 'App/ClerkPlugin.swift';

console.log('Loading Xcode project...');
const project = xcode.project(projectPath);

project.parse((err) => {
  if (err) {
    console.error('Error parsing project:', err);
    process.exit(1);
  }

  console.log('Adding ClerkPlugin.swift to project...');

  // Add the Swift file to the project
  const swiftFile = project.addSourceFile(clerkPluginPath, {}, 'App');

  if (swiftFile) {
    console.log('✓ ClerkPlugin.swift added successfully');
  } else {
    console.log('✓ ClerkPlugin.swift already exists in project');
  }

  // Add the Objective-C file to the project
  const clerkPluginMPath = 'App/ClerkPlugin.m';
  const mFile = project.addSourceFile(clerkPluginMPath, {}, 'App');

  if (mFile) {
    console.log('✓ ClerkPlugin.m added successfully');
  } else {
    console.log('✓ ClerkPlugin.m already exists in project');
  }

  // Write the modified project back
  fs.writeFileSync(projectPath, project.writeSync());
  console.log('✓ Project file saved');
  console.log('\nNext steps:');
  console.log('1. Clean build: Cmd + Shift + K in Xcode');
  console.log('2. Build: Cmd + B');
  console.log('3. Run: Cmd + R');
});
