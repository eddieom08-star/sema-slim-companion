# SemaSlim Mobile - Quick Start Guide

Your application has been configured for mobile deployment using Capacitor!

## ✅ What's Been Set Up

1. **Capacitor Configuration** - `capacitor.config.ts`
2. **Mobile Initialization** - `client/src/mobile-init.ts`
3. **iOS & Android Projects** - Native projects created in `/ios` and `/android`
4. **Essential Plugins Installed**:
   - Status Bar, Splash Screen, Keyboard
   - Camera, Network, Preferences
   - App lifecycle management

5. **Build Scripts** Added to `package.json`:
   - `npm run mobile:build` - Build web app
   - `npm run mobile:sync` - Sync with native projects
   - `npm run mobile:ios` - Open in Xcode
   - `npm run mobile:android` - Open in Android Studio

## 🚀 Quick Start

### Option 1: Development Mode (Recommended for Testing)

Test with your local server without building:

1. **Find your local IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Edit `capacitor.config.ts`:**
   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:3000',  // e.g., '192.168.1.100:3000'
     cleartext: true,
   },
   ```

3. **Start your backend:**
   ```bash
   npm run dev
   ```

4. **Sync and run:**
   ```bash
   npx cap sync
   npm run mobile:run:ios     # or mobile:run:android
   ```

### Option 2: Production Mode

Build and deploy the app:

```bash
npm run mobile:sync
npm run mobile:ios    # Opens Xcode
```

## 📱 Running on iOS

### Using Xcode (Easiest):
```bash
npm run mobile:ios
```
Then in Xcode:
- Select your target device (Simulator or iPhone)
- Click the ▶️ Play button

### Common iOS Issues

**CocoaPods Error (like you see above)**:
```bash
cd ios/App
sudo gem install cocoapods
pod install
cd ../..
```

Or if you have architecture issues:
```bash
sudo gem pristine ffi
sudo gem install cocoapods
```

## 📱 Running on Android

### Using Android Studio (Easiest):
```bash
npm run mobile:android
```
Then in Android Studio:
- Select your target device (Emulator or phone)
- Click the ▶️ Run button

### Prerequisites for Android:
- Android Studio installed
- Android SDK configured
- Java JDK 17+

## 🔧 Important Configuration

### Backend URL
Your app needs to connect to your backend API. You have two options:

**For Development (Local Testing):**
- Use your computer's local IP in `capacitor.config.ts`
- Make sure phone/emulator is on same WiFi network

**For Production:**
- Deploy your backend to a server (Railway, Render, Heroku, etc.)
- Update API endpoints in your app
- The bundled web app will be used

### Environment Variables
The mobile app uses the same environment variables as your web app:
- Clerk authentication will work automatically
- Database connection via your backend API
- Claude AI integration via backend

## 📋 Next Steps

1. **Fix CocoaPods (if needed):**
   ```bash
   cd ios/App && pod install
   ```

2. **Run on Simulator/Emulator:**
   ```bash
   npm run mobile:run:ios
   # or
   npm run mobile:run:android
   ```

3. **Test on Physical Device:**
   - iOS: Connect iPhone, select in Xcode, click Run
   - Android: Enable USB Debugging, connect, click Run

4. **For Expo Go Alternative:**
   Note: This app uses Capacitor (better for web->mobile conversion)
   Expo Go would require restructuring to React Native

## 📖 Full Documentation

See `MOBILE_SETUP.md` for complete documentation including:
- Troubleshooting guide
- Release build instructions
- App Store submission
- Play Store submission

## 🎯 Current Status

✅ iOS project created at `/ios`
✅ Android project created (pending)
⚠️ CocoaPods needs installation (see iOS section above)
✅ All mobile plugins installed
✅ Build configuration complete

## Need Help?

- Full docs: `MOBILE_SETUP.md`
- Capacitor docs: https://capacitorjs.com/docs
- Issues: Check the troubleshooting section in MOBILE_SETUP.md
