# Mobile Initialization Files

This directory contains two versions of mobile initialization:

## `mobile-init.ts` (Web/Vercel builds)
- Stub implementation for web deployments
- No Capacitor dependencies
- Returns mock values
- Used by Vercel and web builds

## `mobile-init.native.ts` (iOS/Android builds)
- Full Capacitor implementation
- Imports all mobile plugins
- Used for iOS and Android Capacitor builds
- Should be manually used when building for mobile

## Usage

### For Web/Vercel Deployment
Import the default file (already done in `main.tsx`):
```typescript
import { initializeMobile } from './mobile-init';
```

### For Mobile Builds (iOS/Android)
When building for mobile with Capacitor, update the import in `main.tsx`:
```typescript
import { initializeMobile } from './mobile-init.native';
```

Or create a build script that handles this automatically.

## Why Two Files?

Vite/Rollup cannot handle dynamic imports that might fail at build time. Capacitor dependencies are not available in web-only builds, so we maintain two versions:
- Web version: No dependencies on Capacitor
- Native version: Full Capacitor plugin integration
