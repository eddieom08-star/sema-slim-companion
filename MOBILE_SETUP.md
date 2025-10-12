# Mobile Setup Guide for SemaSlim

This guide will help you run the SemaSlim app on iOS and Android devices using Capacitor.

## Prerequisites

### For iOS Development:
- macOS with Xcode installed
- iOS Simulator or physical iPhone
- Apple Developer account (for physical devices)

### For Android Development:
- Android Studio installed
- Android SDK and emulator configured
- JDK 17 or higher

## Setup Steps

### 1. Build the Web App
First, build the web application:
```bash
npm run mobile:build
```

### 2. Sync with Native Projects
This creates/updates the iOS and Android projects:
```bash
npx cap sync
```

Or use the combined command:
```bash
npm run mobile:sync
```

### 3. Run on iOS

#### Using iOS Simulator:
```bash
npm run mobile:run:ios
```

#### Using Xcode (recommended for first run):
```bash
npm run mobile:ios
```
This opens Xcode where you can:
- Select your target device (simulator or physical)
- Click the Play button to build and run

### 4. Run on Android

#### Using Android Emulator:
```bash
npm run mobile:run:android
```

#### Using Android Studio (recommended for first run):
```bash
npm run mobile:android
```
This opens Android Studio where you can:
- Select your target device (emulator or physical)
- Click the Run button to build and deploy

## Development Workflow

### Testing with Live Server
For development, you can point the app to your local development server:

1. Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:3000',  // e.g., 'http://192.168.1.100:3000'
  cleartext: true,
},
```

2. Find your local IP:
   - **macOS/Linux**: `ifconfig | grep inet`
   - **Windows**: `ipconfig`

3. Sync the changes:
```bash
npx cap sync
```

4. Start your development server:
```bash
npm run dev
```

5. Run the app on your device/emulator

**Note**: Your device must be on the same network as your development machine.

### Production Build
For production, build the web app and sync:
```bash
npm run mobile:sync
```
The app will use the bundled files in `dist/public`.

## Available Scripts

- `npm run mobile:build` - Build web app for mobile
- `npm run mobile:sync` - Build and sync with native projects
- `npm run mobile:ios` - Open iOS project in Xcode
- `npm run mobile:android` - Open Android project in Android Studio
- `npm run mobile:run:ios` - Build and run on iOS
- `npm run mobile:run:android` - Build and run on Android

## Troubleshooting

### iOS Issues

**"Command PhaseScriptExecution failed"**
- Clean build folder in Xcode (Cmd+Shift+K)
- Delete derived data
- Run `npx cap sync ios` again

**Signing Issues**
- Ensure you have a valid Apple Developer account
- Configure signing in Xcode > Project > Signing & Capabilities

### Android Issues

**SDK not found**
- Set ANDROID_HOME environment variable
- Configure SDK location in Android Studio

**Build fails**
- Check Java version: `java -version` (needs JDK 17+)
- Clean and rebuild: `./gradlew clean` in `android/` folder

### General Issues

**White screen on app launch**
- Check browser console in development mode
- Verify API endpoints are accessible from the device
- Check network connectivity

**API calls fail**
- Ensure backend server is running and accessible
- For local development, use your machine's IP address
- Check CORS configuration on backend

## Environment Variables

Make sure to configure these in your `.env` file:
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication key
- `DATABASE_URL` - Database connection string
- `ANTHROPIC_API_KEY` - Claude AI API key

## App Configuration

Key configuration files:
- `capacitor.config.ts` - Capacitor configuration
- `app.json` - App metadata
- `client/src/mobile-init.ts` - Mobile initialization code

## Building for Release

### iOS App Store
1. Open in Xcode: `npm run mobile:ios`
2. Update version and build number
3. Archive the app (Product > Archive)
4. Upload to App Store Connect

### Google Play Store
1. Open in Android Studio: `npm run mobile:android`
2. Update version in `android/app/build.gradle`
3. Generate signed APK/Bundle (Build > Generate Signed Bundle/APK)
4. Upload to Google Play Console

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Developer Guide](https://developer.apple.com/ios/)
- [Android Developer Guide](https://developer.android.com/)
