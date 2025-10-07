# Overview

SemaSlim is a comprehensive weight management application designed specifically for users of GLP-1 medications (Ozempic, Mounjaro, Wegovy, Rybelsus). The application helps users track their medication schedules, food intake, weight progress, and achievements throughout their weight loss journey. It features a complete onboarding flow, dashboard with key metrics, food tracking with nutritional data, medication logging, and progress visualization.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**Routing**: Wouter for client-side routing, providing a lightweight alternative to React Router.

**State Management**: TanStack Query (React Query) for server state management, caching, and data synchronization. No global client state management library is used; component-level state with hooks is preferred.

**UI Component Library**: shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS. The design system uses CSS variables for theming and follows the "new-york" style preset.

**Styling**: Tailwind CSS with custom configuration, using CSS variables for colors and design tokens. PostCSS for processing.

**Key Pages**:
- Landing page for unauthenticated users
- Onboarding flow for new users to set up their profile
- Dashboard showing key metrics and recent activity
- Food tracking page for logging meals and nutrition
- Medication page for managing and logging medications
- Recipes page for browsing, creating, and managing GLP-1-friendly recipes
- Progress page for visualizing weight loss and achievements
- Profile page for viewing and editing user information

**Notification System**: Slide-out notification center accessible via bell icon in navigation. Displays unread count badge, supports marking as read/unread, deleting notifications, and clicking notifications to navigate to related content. Auto-refreshes every 30 seconds.

**Progressive Web App (PWA)**: Full PWA capabilities with offline support, installability, and push notifications:
- Service worker with smart caching (network-first for navigation/API, cache-first for static assets)
- Web Push API integration for browser notifications with push_subscriptions table
- Offline queue with IndexedDB for failed requests (3 retry attempts with exponential backoff)
- Network-aware components that detect slow connections and adjust UI accordingly
- Image optimization with lazy loading, intersection observer, and WebP format support
- Resource preloading for critical assets (icons, manifest, fonts)
- Touch target accessibility with 44x44px minimum for all interactive elements
- Install prompts for adding app to home screen
- Offline indicator and fallback pages

## Backend Architecture

**Framework**: Express.js server with TypeScript support, using ESM modules.

**API Design**: RESTful API endpoints under `/api` prefix. All endpoints require authentication. Auth0 handles authentication via `/login`, `/logout`, and `/callback` routes at the root level.

**Request Handling**: Express middleware for JSON parsing, request logging, and error handling. Custom middleware captures response times and logs API calls.

**Development Server**: Vite middleware integration for HMR and development builds. Production builds serve static files from `dist/public`.

**Error Handling**: Centralized error responses with appropriate HTTP status codes. Unauthorized errors (401) trigger client-side redirect to login.

**Security Middleware**: Enterprise-grade security hardening with multiple layers of protection:
- **Helmet.js**: Secure HTTP headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- **Rate Limiting**: IP-based request throttling (100 requests/15min for API, 5 requests/15min for auth endpoints)
- **CORS**: Configured to allow same-origin requests and trusted domains (.replit.app, .replit.dev, localhost in development)
- **XSS Protection**: Input sanitization via express-xss-sanitizer to prevent cross-site scripting attacks
- **NoSQL Injection Prevention**: express-mongo-sanitize removes MongoDB operators from user input
- **HTTP Parameter Pollution (HPP)**: Protection against parameter pollution attacks
- **Trust Proxy**: Configured for Replit environment to enable accurate IP-based rate limiting behind proxies

## Authentication

**Provider**: Clerk authentication for complete user management, sign-in, and sign-up flows.

**Backend Integration**: 
- `@clerk/express` SDK with `clerkMiddleware()` applied to all routes
- `requireAuth` middleware protects API endpoints by validating Clerk session
- User data synced from Clerk to local database on authenticated requests
- Authentication state available via `req.auth` object containing userId, sessionId, and user data

**Frontend Integration**:
- `@clerk/clerk-react` SDK with `ClerkProvider` wrapping the entire app
- Pre-built UI components for sign-in/sign-up (`SignInButton`, `SignUpButton`, `UserButton`)
- Modal-based authentication flow for seamless UX
- `useAuth` hook integrates Clerk's authentication state with TanStack Query

**Session Management**: Clerk manages sessions via secure, HTTP-only cookies automatically. Sessions include JWT tokens validated on the backend.

**User Storage**: Users table stores profile information synced from Clerk user data. Supports upsert operations to handle returning users and profile updates.

**Configuration**: Requires Clerk API credentials:
- `CLERK_PUBLISHABLE_KEY`: Frontend key for initializing Clerk (safe to expose)
- `CLERK_SECRET_KEY`: Backend key for validating sessions (kept secret)

## Database

**ORM**: Drizzle ORM with PostgreSQL dialect, using Neon serverless driver with WebSocket support.

**Connection**: Connection pooling via `@neondatabase/serverless` Pool with WebSocket constructor for compatibility.

**Schema Location**: Shared schema definition in `shared/schema.ts` allows type sharing between client and server.

**Migrations**: Drizzle Kit handles schema migrations with output to `./migrations` directory.

**Key Tables**:
- `users`: User profiles with health metrics and onboarding status
- `medications`: User medication schedules and configurations
- `medication_logs`: Timestamped medication intake records
- `food_entries`: Nutritional data for consumed foods
- `weight_logs`: Weight measurements over time
- `body_measurements`: Additional body metrics tracking
- `achievements`: Predefined achievement types
- `user_achievements`: Earned achievements per user
- `daily_streaks`: Consistency tracking for various activities
- `user_goals`: Personal goals and targets
- `notifications`: User notifications with type, title, message, read status, and optional action URL
- `push_subscriptions`: Web Push API subscriptions for browser notifications
- `sessions`: Session storage for authentication
- `recipes`: User and public recipes with nutritional information, ingredients, instructions, and GLP-1-friendly filtering
- `recipe_favorites`: User's favorited recipes
- `meal_plans`: Weekly meal planning schedules
- `meal_plan_entries`: Individual meal assignments within meal plans
- `meal_prep_schedules`: Meal preparation scheduling and tracking
- `nutritional_recommendations`: GLP-1-friendly nutritional guidance and recommendations

**Data Validation**: Zod schemas generated from Drizzle tables using `drizzle-zod` for runtime validation on API endpoints.

## Data Layer

**Storage Interface**: Abstract storage interface (`IStorage`) in `server/storage.ts` defines all database operations. This abstraction allows for potential swapping of data sources.

**Operations**: CRUD operations for all entities, with specialized queries for dashboard aggregation, date-range filtering, and user-specific data retrieval.

**Data Flow**: 
1. Client makes authenticated request
2. Route handler validates input with Zod schema
3. Storage layer executes database query
4. Response serialized as JSON

## External Dependencies

**Database**: Neon PostgreSQL serverless database (required via `DATABASE_URL` environment variable).

**Authentication Service**: Auth0 for user authentication and authorization (configured via `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `SESSION_SECRET` environment variables).

**Session Storage**: PostgreSQL-backed session store using the same database connection.

**Font Resources**: Google Fonts for Inter, Architects Daughter, DM Sans, Fira Code, and Geist Mono typefaces.

**Icon Library**: Font Awesome icons (loaded via CDN in HTML).

**Chart Visualization**: Recharts library for rendering progress charts and data visualizations.

**Development Tools**: 
- Replit-specific Vite plugins for runtime error overlay, cartographer, and dev banner
- ESBuild for server-side bundling in production

## Mobile Compilation

**Framework**: Capacitor 7 for compiling the web app into native iOS and Android applications.

**Configuration**: 
- App ID: `com.semaslim.app` (customizable in `capacitor.config.ts`)
- Web directory: `dist/public` (matches Vite build output)
- HTTPS scheme for both platforms for enhanced security

**Build Process**:
1. Build web app: `npm run build`
2. Sync to native platforms: `npx cap sync` or `./mobile-build.sh sync`
3. Open in native IDE: `./mobile-build.sh ios` or `./mobile-build.sh android`

**Platform Requirements**:
- **iOS**: macOS with Xcode 14+, CocoaPods for dependency management
- **Android**: Android Studio with JDK 17+ and Android SDK Platform 33+

**Helper Scripts**: 
- `mobile-build.sh` provides convenient commands for common Capacitor operations
- `.env.mobile.example` template for mobile-specific environment configuration

**Documentation**: See `MOBILE_SETUP.md` for complete mobile compilation instructions, troubleshooting, and deployment guides.

**Native Features**: Capacitor provides JavaScript APIs for native device features like camera (barcode scanning), local notifications (medication reminders), and secure storage.

## PWA Implementation

**Service Worker**: `client/public/sw.js` - Handles offline caching with network-first strategy for navigation/API requests and cache-first for static assets. Fallback to `/index.html` from static cache when offline.

**PWA Utilities**: `client/src/lib/pwa.ts` - Service worker registration, install prompts, connection speed detection, and critical asset preloading.

**Offline Queue**: `client/src/lib/offline-queue.ts` - IndexedDB-based request queue with 3 retry attempts and exponential backoff. Processes automatically when connection restored.

**PWA Components**:
- `client/src/components/pwa-install-prompt.tsx` - Installability prompt for adding to home screen
- `client/src/components/offline-indicator.tsx` - Visual indicator when device is offline  
- `client/src/components/network-aware.tsx` - Slow connection detection and UI adaptation
- `client/src/components/optimized-image.tsx` - Lazy loading images with intersection observer and WebP support
- `client/src/components/notification-permission.tsx` - Web Push notification permission UI

**Manifest**: `client/public/manifest.json` - PWA metadata, icons (192x192, 512x512 SVG), theme colors, and display mode.

**Touch Accessibility**: All interactive UI components (buttons, checkboxes, radio buttons) updated to meet 44x44px minimum touch target size for mobile accessibility.

## Design Decisions

**Monorepo Structure**: Client, server, and shared code in single repository with TypeScript path aliases (`@/`, `@shared/`) for clean imports.

**Type Safety**: End-to-end TypeScript with strict mode enabled. Shared types between client and server prevent API contract mismatches.

**Component Co-location**: UI components organized by feature with reusable primitives in `components/ui/`.

**Progressive Enhancement**: Application requires JavaScript but degrades gracefully with loading states and error boundaries.

**Mobile Responsiveness**: Tailwind responsive utilities with mobile-first approach. Custom hook (`useIsMobile`) for conditional logic.

**Accessibility**: Radix UI primitives provide ARIA attributes and keyboard navigation out of the box.

**Performance**: Query caching with infinite stale time reduces redundant requests. Vite's code splitting ensures optimal bundle sizes.

**Security**: 
- Secure session cookies with HTTP-only and secure flags
- CSRF protection via session-based authentication
- Input validation on all endpoints
- Environment variable validation at startup
- User-scoped notification operations prevent cross-user access (mark as read, delete require userId verification)