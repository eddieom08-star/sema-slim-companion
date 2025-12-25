#!/usr/bin/env ruby

require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the App target
target = project.targets.find { |t| t.name == 'App' }

# Get the App group
app_group = project.main_group['App']

# Check if ClerkPlugin.swift already exists
clerk_plugin_ref = app_group.files.find { |f| f.path == 'ClerkPlugin.swift' }

if clerk_plugin_ref.nil?
  # Add ClerkPlugin.swift to the project
  file_ref = app_group.new_file('App/ClerkPlugin.swift')

  # Add to compile sources
  target.add_file_references([file_ref])

  puts "Added ClerkPlugin.swift to Xcode project"
else
  puts "ClerkPlugin.swift already exists in project"
end

# Save the project
project.save

puts "Xcode project updated successfully"
