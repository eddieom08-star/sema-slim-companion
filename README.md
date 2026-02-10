<p align="center">
  <img src="client/public/icons/icon-192.svg" width="80" height="80" alt="SemaSlim Logo" />
</p>

<h1 align="center">SemaSlim</h1>

<p align="center">
  <strong>Your GLP-1 Weight Management Companion</strong>
</p>

<p align="center">
  A full-stack web and mobile application for people on GLP-1 medications (Ozempic, Mounjaro, Wegovy, Rybelsus) to track their health journey — food, medication, weight, and progress — all in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Capacitor-7.4-119EFF?logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

---

## Screenshots

> Add your screenshots to `docs/screenshots/` — see [docs/screenshots/README.md](docs/screenshots/README.md) for naming conventions.

### Welcome & Onboarding

| Landing Page | Onboarding Flow |
|:---:|:---:|
| ![Landing](docs/screenshots/01-landing.png) | ![Onboarding](docs/screenshots/02-onboarding.png) |

### Core Experience

| Dashboard | Food Tracking |
|:---:|:---:|
| ![Dashboard](docs/screenshots/03-dashboard.png) | ![Food Tracking](docs/screenshots/04-food-tracking.png) |

| Medication Tracking | AI Recipes |
|:---:|:---:|
| ![Medication](docs/screenshots/05-medication.png) | ![Recipes](docs/screenshots/06-recipes.png) |

| Progress Analytics | Profile & Settings |
|:---:|:---:|
| ![Progress](docs/screenshots/07-progress.png) | ![Profile](docs/screenshots/08-profile.png) |

### Mobile (iOS)

<p align="center">
  <img src="docs/screenshots/09-mobile-ios.png" width="300" alt="iOS App" />
</p>

---

## Features

### Medication Tracking
- Log doses for Ozempic, Mounjaro, Wegovy, and Rybelsus
- Track adherence with daily logs and reminders
- Record side effects and dosage adjustments
- Visual adherence timeline

### Food & Nutrition
- Log meals with calorie and macro tracking
- Barcode scanner for packaged foods (Nutritionix database)
- Receipt scanning with AI-powered food recognition
- Searchable food database with nutritional data

### Weight & Body Measurements
- Daily weight logging with trend visualization
- Body measurements (waist, chest, hips, arms, thighs)
- Progress charts powered by Recharts
- Goal tracking with milestone notifications

### AI-Powered Features
- Meal plan generation via Claude AI
- Recipe suggestions tailored to GLP-1 dietary needs
- Receipt-to-recipe scanning
- Nutritional analysis and recommendations

### Gamification
- Daily streaks for food tracking, medication adherence, and weight logging
- Achievement system with unlockable badges
- Points, levels, and lifetime score tracking
- Streak shields to protect progress during off-days

### Progress & Analytics
- Weight loss trend charts
- Calorie intake over time
- Appetite tracking
- Medication adherence rates
- PDF report generation for healthcare providers

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, Framer Motion, Recharts |
| **Backend** | Express.js, TypeScript, Helmet, Rate Limiting |
| **Database** | PostgreSQL (Neon Serverless), Drizzle ORM |
| **Auth** | Clerk (Web SDK + Native iOS SDK) |
| **Payments** | Stripe (web), RevenueCat (mobile IAP) |
| **AI** | Anthropic Claude SDK |
| **Mobile** | Capacitor 7 (iOS + Android) |
| **Deployment** | Vercel (primary), Render (alternative) |
| **Testing** | Playwright (E2E) |

---

## Project Structure

```
sema-slim-companion/
├── client/                     # React frontend
│   └── src/
│       ├── components/         # 70+ React components
│       │   └── ui/             # Radix UI primitives (button, card, dialog, etc.)
│       ├── pages/              # Route-level page components
│       │   ├── dashboard.tsx   # Health metrics overview
│       │   ├── food-tracking.tsx
│       │   ├── medication.tsx
│       │   ├── recipes.tsx
│       │   ├── progress.tsx
│       │   └── profile.tsx
│       ├── hooks/              # Custom React hooks
│       ├── contexts/           # Subscription context provider
│       └── lib/                # Utilities, API clients, offline queue
├── server/                     # Express backend
│   ├── routes.ts               # 80+ API endpoints
│   ├── routes/
│   │   └── monetization.ts     # Subscription & payment endpoints
│   ├── services/               # Business logic (entitlements, Stripe, RevenueCat, PDF)
│   ├── middleware/              # Feature gating middleware
│   ├── storage.ts              # Data access layer
│   └── db.ts                   # Neon PostgreSQL connection
├── shared/
│   ├── schema.ts               # Drizzle ORM schema (15+ tables)
│   └── features.ts             # Tier limits & product definitions
├── ios/                        # Capacitor iOS project
│   └── App/App/
│       ├── ClerkPlugin.swift   # Native Clerk auth bridge
│       └── PurchasesPlugin.swift # RevenueCat bridge
├── migrations/                 # Drizzle database migrations
├── e2e/                        # Playwright E2E tests
└── docs/                       # Extended documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **PostgreSQL** database (or a [Neon](https://neon.tech) account)
- **Clerk** account for authentication
- **Stripe** account for web payments (optional for development)
- **Xcode 15+** for iOS builds (macOS only)

### 1. Clone & Install

```bash
git clone https://github.com/eddieom08-star/sema-slim-companion.git
cd sema-slim-companion
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/semaslim
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments (optional for dev)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...

# RevenueCat (mobile IAP)
REVENUECAT_API_KEY=sk_...

# Application
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_random_secret

# Optional
ANTHROPIC_API_KEY=sk-ant-...      # AI meal plans & recipes
NUTRITIONIX_APP_ID=...            # Food database / barcode lookup
NUTRITIONIX_API_KEY=...
```

### 3. Database Setup

```bash
npm run db:push
```

This pushes the Drizzle ORM schema to your PostgreSQL database.

### 4. Run Development Server

```bash
npm run dev
```

The app starts at `http://localhost:5000` with hot-reloading for both frontend and backend.

---

## Mobile Development (iOS)

### Setup

1. Ensure Xcode 15+ is installed
2. Build and sync web assets:

```bash
npm run mobile:sync:ios
```

3. Open the Xcode project:

```bash
npm run mobile:ios
```

### Development Workflow

```bash
# Full build + sync + open Xcode
npm run mobile:ios

# Build + run on simulator directly
npm run mobile:run:ios

# Live reload during development
npm run mobile:watch
```

### Native Plugins

| Plugin | Purpose |
|--------|---------|
| `ClerkPlugin.swift` | Native Clerk SDK authentication (sign-in, sign-up, sign-out) |
| `PurchasesPlugin.swift` | RevenueCat in-app purchase management |
| `@capacitor/camera` | Meal photo capture |
| `@capacitor/network` | Connection detection for offline mode |
| `@capacitor/preferences` | Local storage bridge |

For detailed mobile setup, see [MOBILE_SETUP.md](MOBILE_SETUP.md) and [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md).

---

## API Overview

The backend exposes 80+ REST endpoints grouped by domain:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| **Auth** | 6 | Login, logout, session, profile |
| **Medications** | 6 | CRUD medications, log doses |
| **Food Tracking** | 8 | CRUD food entries, barcode lookup, database search |
| **Weight & Body** | 4 | Weight logs, body measurements |
| **Dashboard** | 3+ | Aggregated health metrics |
| **Gamification** | 5+ | Streaks, achievements, points |
| **Recipes** | 4+ | AI meal plans, recipe CRUD |
| **Monetization** | 8+ | Subscriptions, checkout, webhooks |
| **Health** | 4 | Health check, readiness, diagnostics |

All authenticated endpoints use Clerk JWT verification.

---

## Monetization

SemaSlim uses a freemium model with two tiers:

### Free Tier
- 2 AI meal plans / month
- 2 AI recipe suggestions / month
- 10 barcode scans / day
- 14-day data history
- 5 achievements
- Basic food database

### Pro Tier ($9.99/mo or $79.99/yr)
- 30 AI meal plans / month
- 100 AI recipe suggestions / month
- Unlimited barcode scans
- Unlimited data history
- All achievements unlocked
- Premium food database
- 5 PDF exports / month
- 2 streak shields / month
- Family sharing (up to 3 members)
- Data export

### Token Purchases (a-la-carte)
- AI Tokens: 5 ($4.99) / 15 ($11.99) / 50 ($29.99)
- Streak Shields: 3 ($2.99) / 10 ($7.99)
- PDF Exports: 1 ($1.99) / 5 ($6.99)

Payment processing: **Stripe** (web) and **RevenueCat** (iOS/Android in-app purchases).

---

## Deployment

### Vercel (Recommended)

```bash
npm run vercel-build
```

Environment variables are configured in the Vercel dashboard. See [VERCEL_SETUP.md](VERCEL_SETUP.md) for the full guide.

Key configuration in `vercel.json`:
- API routes rewrite to the serverless function
- SPA fallback for client-side routing
- 30-second function timeout, 1GB memory

### Render (Alternative)

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for setup instructions.

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Production build (client + server) |
| `npm run start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run mobile:sync` | Build web + sync to native projects |
| `npm run mobile:sync:ios` | Build web + sync to iOS only |
| `npm run mobile:ios` | Sync + open Xcode |
| `npm run mobile:run:ios` | Sync + build + run on iOS simulator |
| `npm run mobile:watch` | Live reload for mobile dev |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run vercel-build` | Build for Vercel deployment |

---

## Documentation

| Document | Description |
|----------|-------------|
| [MOBILE_SETUP.md](MOBILE_SETUP.md) | Full mobile development guide |
| [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) | Quick reference for mobile commands |
| [VERCEL_SETUP.md](VERCEL_SETUP.md) | Vercel deployment configuration |
| [CLERK_IOS_SETUP.md](CLERK_IOS_SETUP.md) | Native iOS Clerk SDK integration |
| [CLERK_PRODUCTION_SETUP.md](CLERK_PRODUCTION_SETUP.md) | Production Clerk configuration |
| [DATABASE_SETUP.md](DATABASE_SETUP.md) | Database initialization guide |
| [docs/MONETIZATION_STRATEGY.md](docs/MONETIZATION_STRATEGY.md) | Business model and pricing |
| [docs/MONETIZATION_TECHNICAL_SPEC.md](docs/MONETIZATION_TECHNICAL_SPEC.md) | Payment integration details |
| [docs/REVENUECAT_SETUP.md](docs/REVENUECAT_SETUP.md) | Mobile IAP setup |
| [docs/APP_STORE_COMPLIANCE.md](docs/APP_STORE_COMPLIANCE.md) | App Store submission requirements |

---

## Security

- **Helmet** for HTTP security headers and CSP
- **Rate limiting** — 100 requests/15min (API), 5 requests/15min (auth endpoints)
- **Data sanitization** — mongo-sanitize, xss-sanitizer, hpp
- **Clerk-managed authentication** with JWT verification
- **CORS** restricted to known origins
- Environment secrets never exposed to the client bundle

---

## License

Private. All rights reserved.
