# SemaSlim Mobile App Setup Guide

This guide explains how to compile your SemaSlim web app into native iOS and Android applications using Capacitor.

## Prerequisites

### For iOS Development
- macOS computer
- Xcode 14+ installed
- iOS Developer account (for App Store deployment)
- CocoaPods installed: `sudo gem install cocoapods`

### For Android Development
- Android Studio installed
- Java Development Kit (JDK) 17+
- Android SDK Platform 33+

## Quick Start

### 1. Build the Web Application

```bash
npm run build
```

This creates an optimized production build in `dist/public/`.

### 2. Add Mobile Platforms

**For iOS:**
```bash
./mobile-build.sh add-ios
```

**For Android:**
```bash
./mobile-build.sh add-android
```

Or use npx directly:
```bash
npx cap add ios
npx cap add android
```

### 3. Sync Web Assets to Native Projects

After building the web app, sync the changes:

```bash
./mobile-build.sh sync
```

Or:
```bash
npx cap sync
```

### 4. Open Native IDEs

**For iOS:**
```bash
./mobile-build.sh ios
```

**For Android:**
```bash
./mobile-build.sh android
```

This opens Xcode or Android Studio where you can:
- Configure app signing
- Set permissions
- Build and run on simulators/devices
- Submit to app stores

## Configuration

### App Identity

Edit `capacitor.config.ts` to customize your app:

```typescript
const config: CapacitorConfig = {
  appId: 'com.yourcompany.semaslim',  // Change this!
  appName: 'SemaSlim',
  webDir: 'dist/public',
};
```

### Environment Variables

For mobile builds, create `.env.mobile`:

```bash
cp .env.mobile.example .env.mobile
```

**IMPORTANT SECURITY NOTE:** Only `VITE_` prefixed environment variables are embedded in the mobile app. Server-side secrets like `AUTH0_CLIENT_SECRET`, `DATABASE_URL`, and `SESSION_SECRET` must NEVER be included in mobile builds. These secrets should only exist on your backend server.

Update the API URL in `.env.mobile` to point to your backend:
- **Local testing:** Use your computer's IP address (e.g., `http://192.168.1.100:5000`)
- **Production:** Use your deployed API URL (e.g., `https://your-api-domain.com`)

```
VITE_API_URL=https://your-api-domain.com
VITE_APP_NAME=SemaSlim
VITE_APP_VERSION=1.0.0
```

Your backend server handles all authentication. The mobile app communicates with your backend API, which then manages Auth0 sessions and database access securely.

## Development Workflow

### Making Changes

1. Update your React/TypeScript code
2. Build the web app: `npm run build`
3. Sync to native projects: `./mobile-build.sh sync`
4. Test in Xcode/Android Studio

### Live Reload (Development)

For faster iteration during development:

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.xxx:5000',  // Your dev machine IP
     cleartext: true
   }
   ```

3. Run the app in the simulator/device
4. Changes will hot-reload automatically

**Remember:** Remove the `server.url` config before production builds!

## Platform-Specific Configuration

### iOS

1. Open `ios/App/App.xcworkspace` in Xcode
2. Update Bundle Identifier (matches `appId` in config)
3. Configure signing in "Signing & Capabilities"
4. Update deployment target (iOS 13.0+)
5. Set required permissions in `Info.plist`:
   - Camera (for barcode scanning)
   - Photo Library (for profile pictures)
   - Notifications (for medication reminders)

### Android

1. Open `android/` folder in Android Studio
2. Update `package` in `android/app/build.gradle`
3. Update `minSdkVersion` (21+) and `targetSdkVersion` (33+)
4. Set permissions in `AndroidManifest.xml`:
   - CAMERA
   - READ_EXTERNAL_STORAGE
   - INTERNET

## Building for Production

### iOS

1. Open in Xcode: `./mobile-build.sh ios`
2. Select "Any iOS Device" as target
3. Product → Archive
4. Follow Xcode's submission process to App Store

### Android

1. Open in Android Studio: `./mobile-build.sh android`
2. Build → Generate Signed Bundle / APK
3. Follow the signing wizard
4. Upload to Google Play Console

## Native Features

Capacitor provides access to native APIs:

```typescript
import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Storage } from '@capacitor/preferences';

// Example: Take a photo
const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri
});
```

To add more native plugins:

```bash
npm install @capacitor/camera
npx cap sync
```

## Troubleshooting

### Build Errors

**"webDir not found"**
- Run `npm run build` first
- Verify `dist/public` directory exists

**iOS Pod Install Fails**
```bash
cd ios/App
pod repo update
pod install
```

**Android Gradle Errors**
- Update Android Studio
- Sync Gradle files
- Clear cache: Build → Clean Project

### API Connection Issues

- Check `VITE_API_URL` environment variable in your mobile build
- Ensure backend allows CORS for your mobile app origin
- For local testing, use computer's IP, not localhost (mobile devices can't reach localhost)
- Verify your backend server has correct Auth0 configuration and allows the mobile app's callback URLs

### Permissions

If native features don't work:
- Check platform-specific permission configs
- Request permissions at runtime
- Verify capabilities in Xcode

## Testing

### iOS Simulator
```bash
./mobile-build.sh ios
# In Xcode: Select simulator → Press Play
```

### Android Emulator
```bash
./mobile-build.sh android
# In Android Studio: Select emulator → Press Play
```

### Physical Devices

**iOS:**
- Connect device via USB
- Trust certificate on device
- Select device in Xcode
- Build and run

**Android:**
- Enable Developer Mode on device
- Enable USB Debugging
- Connect via USB
- Select device in Android Studio

## Helpful Commands

```bash
# Check Capacitor status
npx cap doctor

# Update Capacitor
npm install @capacitor/cli@latest @capacitor/core@latest
npm install @capacitor/ios@latest @capacitor/android@latest
npx cap sync

# View native logs
npx cap run ios --livereload
npx cap run android --livereload
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://material.io/design)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## Support

For issues specific to:
- **Capacitor:** Check [Capacitor GitHub](https://github.com/ionic-team/capacitor)
- **SemaSlim App:** Review the main README or contact support
