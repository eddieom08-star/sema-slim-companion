# CocoaPods Fix for Apple Silicon Macs

You're seeing this error because of an architecture mismatch between your Mac (ARM64/M1/M2) and older Ruby gems (x86_64).

## Quick Fixes (Choose One)

### Option 1: Update CocoaPods (Recommended)
```bash
# Uninstall old CocoaPods
sudo gem uninstall cocoapods

# Install latest version
sudo gem install cocoapods

# Go to iOS folder and install
cd ios/App
pod install
```

### Option 2: Use Homebrew Ruby
```bash
# Install rbenv for better Ruby management
brew install rbenv ruby-build

# Install latest Ruby
rbenv install 3.2.2
rbenv global 3.2.2

# Update shell profile (add to ~/.zshrc or ~/.bash_profile)
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
source ~/.zshrc

# Install CocoaPods with new Ruby
gem install cocoapods

# Install pods
cd ios/App
pod install
```

### Option 3: Use Bundler (Most Reliable)
```bash
cd ios/App

# Create Gemfile
cat > Gemfile << 'GEMFILE'
source 'https://rubygems.org'
gem 'cocoapods', '~> 1.15'
GEMFILE

# Install with Bundler
gem install bundler
bundle install

# Install pods via Bundler
bundle exec pod install
```

### Option 4: Skip CocoaPods for Now
The iOS project is already created. You can:

1. **Open in Xcode directly:**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Let Xcode handle dependencies:**
   Xcode will prompt to install any missing dependencies when you build

## After Fixing CocoaPods

Once CocoaPods is working, run:
```bash
cd ios/App
pod install
cd ../..
```

Then you can run the app:
```bash
npm run mobile:run:ios
```

## Alternative: Test on Android First

Android doesn't use CocoaPods, so you can test there without fixing this issue:
```bash
npm run mobile:android
```

## Still Having Issues?

### Check Ruby Version
```bash
ruby --version
# Should be 2.7+ or ideally 3.x
```

### Check Architecture
```bash
arch
# Should show "arm64" on M1/M2 Macs
```

### Check CocoaPods
```bash
pod --version
# If this works, try pod install again
```

## For Production/Release

You'll need CocoaPods working eventually for iOS releases. The Bundler approach (Option 3) is most reliable for teams.
