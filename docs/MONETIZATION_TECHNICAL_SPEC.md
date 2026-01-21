# SemaSlim Monetization - Technical Implementation Specification

## Overview

This document provides the technical architecture for implementing the monetization features described in `MONETIZATION_STRATEGY.md`.

---

## Database Schema Additions

### Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Subscription Details
  tier VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'pro'
  billing_period VARCHAR(20), -- 'monthly', 'annual', null for free
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'trialing'

  -- Dates
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Payment Provider
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- RevenueCat (Mobile)
  revenuecat_customer_id VARCHAR(255),
  revenuecat_entitlement_id VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```

### Token Balances Table

```sql
CREATE TABLE token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token Types
  ai_tokens INTEGER NOT NULL DEFAULT 0,
  export_tokens INTEGER NOT NULL DEFAULT 0,
  streak_shields INTEGER NOT NULL DEFAULT 0,

  -- Monthly Allowances (for Pro users)
  ai_tokens_monthly_used INTEGER NOT NULL DEFAULT 0,
  streak_shields_monthly_used INTEGER NOT NULL DEFAULT 0,
  monthly_reset_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_token_balances_user_id ON token_balances(user_id);
```

### Token Transactions Table

```sql
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction Details
  token_type VARCHAR(30) NOT NULL, -- 'ai_tokens', 'export_tokens', 'streak_shields'
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,

  -- Source
  source VARCHAR(30) NOT NULL, -- 'purchase', 'subscription', 'reward', 'usage', 'refund'
  source_reference VARCHAR(255), -- order ID, achievement ID, etc.

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at);
```

### Purchases Table

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Purchase Details
  product_type VARCHAR(30) NOT NULL, -- 'token_pack', 'cosmetic', 'subscription'
  product_id VARCHAR(100) NOT NULL, -- e.g., 'ai_tokens_5', 'theme_dark_pro'
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'refunded', 'failed'

  -- Payment Details
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  apple_transaction_id VARCHAR(255),
  google_order_id VARCHAR(255),

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_stripe_payment ON purchases(stripe_payment_intent_id);
```

### Cosmetic Items Table

```sql
CREATE TABLE cosmetic_items (
  id VARCHAR(100) PRIMARY KEY, -- e.g., 'avatar_frame_gold', 'theme_midnight'

  -- Item Details
  category VARCHAR(30) NOT NULL, -- 'avatar_frame', 'theme', 'badge', 'streak_flame'
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Availability
  price_cents INTEGER, -- null = not purchasable (earned only)
  pro_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
  earnable BOOLEAN NOT NULL DEFAULT FALSE, -- can be earned through achievements
  achievement_id UUID REFERENCES achievements(id),

  -- Display
  preview_url VARCHAR(500),
  asset_data JSONB, -- colors, images, etc.

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cosmetic_items_category ON cosmetic_items(category);
```

### User Cosmetics Table

```sql
CREATE TABLE user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id VARCHAR(100) NOT NULL REFERENCES cosmetic_items(id),

  -- Acquisition
  acquired_via VARCHAR(30) NOT NULL, -- 'purchase', 'achievement', 'default', 'gift'
  purchase_id UUID REFERENCES purchases(id),

  -- Status
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX idx_user_cosmetics_user_id ON user_cosmetics(user_id);
```

### Upsell Events Table (Analytics)

```sql
CREATE TABLE upsell_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event Details
  trigger_type VARCHAR(50) NOT NULL, -- 'ai_limit', 'history_limit', 'streak_risk', etc.
  upsell_type VARCHAR(30) NOT NULL, -- 'pro_subscription', 'token_pack', 'trial'
  placement VARCHAR(50) NOT NULL, -- 'modal', 'inline', 'notification', 'banner'

  -- Response
  action VARCHAR(20), -- 'shown', 'clicked', 'dismissed', 'converted'

  -- Context
  context_data JSONB, -- relevant state (streak length, feature used, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_events_user_id ON upsell_events(user_id);
CREATE INDEX idx_upsell_events_trigger ON upsell_events(trigger_type);
CREATE INDEX idx_upsell_events_action ON upsell_events(action);
CREATE INDEX idx_upsell_events_created_at ON upsell_events(created_at);
```

---

## Feature Flags System

### Feature Configuration

```typescript
// shared/features.ts

export interface FeatureLimits {
  // AI Features
  aiMealPlansPerMonth: number;
  aiRecipeSuggestionsPerMonth: number;

  // Food Tracking
  barcodeScansPerDay: number;
  foodDatabaseTier: 'basic' | 'extended' | 'premium';

  // Data & History
  historyRetentionDays: number;

  // Gamification
  achievementsAvailable: number;
  monthlyStreakShields: number;

  // Export
  pdfExportsIncluded: number;
  dataExportEnabled: boolean;

  // Social
  familySharingSlots: number;
}

export const TIER_LIMITS: Record<'free' | 'pro', FeatureLimits> = {
  free: {
    aiMealPlansPerMonth: 2,
    aiRecipeSuggestionsPerMonth: 5,
    barcodeScansPerDay: 3,
    foodDatabaseTier: 'basic',
    historyRetentionDays: 14,
    achievementsAvailable: 5,
    monthlyStreakShields: 0,
    pdfExportsIncluded: 0,
    dataExportEnabled: false,
    familySharingSlots: 0,
  },
  pro: {
    aiMealPlansPerMonth: 30,
    aiRecipeSuggestionsPerMonth: 100,
    barcodeScansPerDay: Infinity,
    foodDatabaseTier: 'premium',
    historyRetentionDays: Infinity,
    achievementsAvailable: Infinity,
    monthlyStreakShields: 2,
    pdfExportsIncluded: 5,
    dataExportEnabled: true,
    familySharingSlots: 3,
  },
};
```

### User Entitlements Service

```typescript
// server/services/entitlements.ts

import { TIER_LIMITS, FeatureLimits } from '@shared/features';

export interface UserEntitlements extends FeatureLimits {
  tier: 'free' | 'pro';
  isTrialing: boolean;
  trialDaysRemaining: number | null;

  // Current usage
  aiMealPlansUsed: number;
  barcodeScansToday: number;

  // Token balances
  aiTokens: number;
  exportTokens: number;
  streakShields: number;
}

export class EntitlementsService {
  async getUserEntitlements(userId: string): Promise<UserEntitlements> {
    const [subscription, tokenBalance, usage] = await Promise.all([
      this.getSubscription(userId),
      this.getTokenBalance(userId),
      this.getCurrentUsage(userId),
    ]);

    const tier = this.determineTier(subscription);
    const limits = TIER_LIMITS[tier];

    return {
      tier,
      isTrialing: subscription?.status === 'trialing',
      trialDaysRemaining: this.calculateTrialDays(subscription),

      ...limits,

      aiMealPlansUsed: usage.aiMealPlansThisMonth,
      barcodeScansToday: usage.barcodeScansToday,

      aiTokens: tokenBalance.ai_tokens,
      exportTokens: tokenBalance.export_tokens,
      streakShields: tokenBalance.streak_shields,
    };
  }

  async canUseFeature(
    userId: string,
    feature: keyof FeatureLimits,
    quantity: number = 1
  ): Promise<{ allowed: boolean; reason?: string; upsellType?: string }> {
    const entitlements = await this.getUserEntitlements(userId);

    switch (feature) {
      case 'aiMealPlansPerMonth':
        const remaining = entitlements.aiMealPlansPerMonth - entitlements.aiMealPlansUsed;
        if (remaining >= quantity) return { allowed: true };
        if (entitlements.aiTokens >= quantity) return { allowed: true };
        return {
          allowed: false,
          reason: 'ai_limit_reached',
          upsellType: entitlements.tier === 'free' ? 'pro_or_tokens' : 'tokens',
        };

      case 'barcodeScansPerDay':
        if (entitlements.barcodeScansToday < entitlements.barcodeScansPerDay) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: 'barcode_limit_reached',
          upsellType: 'pro',
        };

      // ... other features
    }
  }

  async consumeFeature(
    userId: string,
    feature: string,
    quantity: number = 1,
    useTokens: boolean = false
  ): Promise<void> {
    // Record usage and deduct tokens if applicable
    // Implementation details...
  }
}
```

---

## API Endpoints

### Subscription Endpoints

```typescript
// server/routes/subscriptions.ts

// GET /api/subscription
// Returns current user's subscription status and entitlements
interface GetSubscriptionResponse {
  subscription: {
    tier: 'free' | 'pro';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    billingPeriod: 'monthly' | 'annual' | null;
    currentPeriodEnd: string | null;
    trialEndDate: string | null;
    cancelAtPeriodEnd: boolean;
  };
  entitlements: UserEntitlements;
}

// POST /api/subscription/checkout
// Creates a Stripe checkout session
interface CreateCheckoutRequest {
  priceId: string; // 'price_pro_monthly' | 'price_pro_annual'
  successUrl: string;
  cancelUrl: string;
}

// POST /api/subscription/portal
// Creates a Stripe billing portal session
interface CreatePortalResponse {
  url: string;
}

// POST /api/subscription/cancel
// Cancels subscription at period end
interface CancelSubscriptionResponse {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
}
```

### Token Endpoints

```typescript
// server/routes/tokens.ts

// GET /api/tokens/balance
// Returns current token balances
interface TokenBalanceResponse {
  aiTokens: number;
  exportTokens: number;
  streakShields: number;
  monthlyAiUsed: number;
  monthlyShieldsUsed: number;
}

// POST /api/tokens/purchase
// Initiates token pack purchase
interface PurchaseTokensRequest {
  packId: string; // 'ai_tokens_5', 'ai_tokens_15', 'streak_shields_3', etc.
}

interface PurchaseTokensResponse {
  clientSecret: string; // Stripe PaymentIntent client secret
  purchaseId: string;
}

// POST /api/tokens/use-shield
// Activates a streak shield
interface UseShieldResponse {
  success: boolean;
  remainingShields: number;
  protectedUntil: string;
}
```

### Upsell Endpoints

```typescript
// server/routes/upsells.ts

// POST /api/upsells/event
// Records an upsell event for analytics
interface UpsellEventRequest {
  triggerType: string;
  upsellType: string;
  placement: string;
  action: 'shown' | 'clicked' | 'dismissed' | 'converted';
  contextData?: Record<string, any>;
}

// GET /api/upsells/should-show
// Checks if user should see an upsell (respects frequency caps)
interface ShouldShowUpsellRequest {
  triggerType: string;
}

interface ShouldShowUpsellResponse {
  shouldShow: boolean;
  reason?: string; // 'frequency_cap', 'recently_dismissed', 'user_subscribed'
  lastShownAt?: string;
}
```

### Cosmetics Endpoints

```typescript
// server/routes/cosmetics.ts

// GET /api/cosmetics/shop
// Returns available cosmetic items
interface CosmeticShopResponse {
  categories: {
    category: string;
    items: {
      id: string;
      name: string;
      description: string;
      priceCents: number | null;
      proExclusive: boolean;
      owned: boolean;
      equipped: boolean;
      previewUrl: string;
    }[];
  }[];
}

// POST /api/cosmetics/purchase
// Purchase a cosmetic item
interface PurchaseCosmeticRequest {
  cosmeticId: string;
}

// POST /api/cosmetics/equip
// Equip a cosmetic item
interface EquipCosmeticRequest {
  cosmeticId: string;
  unequipOthersInCategory: boolean;
}
```

---

## Frontend Components

### Subscription Context

```typescript
// client/contexts/SubscriptionContext.tsx

interface SubscriptionContextValue {
  subscription: Subscription | null;
  entitlements: UserEntitlements | null;
  isLoading: boolean;

  // Helpers
  isPro: boolean;
  isTrialing: boolean;
  canUseFeature: (feature: keyof FeatureLimits) => boolean;
  getRemainingUsage: (feature: string) => number;

  // Actions
  refreshSubscription: () => Promise<void>;
  openCheckout: (plan: 'monthly' | 'annual') => Promise<void>;
  openBillingPortal: () => Promise<void>;
}

export const SubscriptionProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // Implementation...
};

export const useSubscription = () => useContext(SubscriptionContext);
```

### Upsell Components

```typescript
// client/components/upsells/ProUpsellModal.tsx

interface ProUpsellModalProps {
  trigger: UpsellTrigger;
  onClose: () => void;
  onUpgrade: () => void;
}

// Different modal variants based on trigger
type UpsellTrigger =
  | { type: 'ai_limit'; plansUsed: number; plansLimit: number }
  | { type: 'history_limit'; daysAvailable: number }
  | { type: 'barcode_limit'; scansToday: number }
  | { type: 'weight_milestone'; weightLost: number }
  | { type: 'streak_risk'; streakLength: number }
  | { type: 'achievement_unlock'; achievementId: string };
```

```typescript
// client/components/upsells/TokenPurchaseSheet.tsx

interface TokenPurchaseSheetProps {
  tokenType: 'ai_tokens' | 'export_tokens' | 'streak_shields';
  onPurchase: (packId: string) => Promise<void>;
  onUpgradeToPro: () => void;
  onClose: () => void;
}
```

```typescript
// client/components/upsells/FeatureGate.tsx

interface FeatureGateProps {
  feature: keyof FeatureLimits;
  children: React.ReactNode;
  fallback?: React.ReactNode; // What to show when feature is locked
  onUpsell?: () => void; // Custom upsell handler
}

// Usage:
<FeatureGate feature="historyRetentionDays" fallback={<HistoryLimitBanner />}>
  <FullHistoryChart />
</FeatureGate>
```

### Pricing Display

```typescript
// client/components/subscription/PricingCard.tsx

interface PricingCardProps {
  plan: 'free' | 'pro_monthly' | 'pro_annual';
  highlighted?: boolean;
  onSelect: () => void;
}

// client/components/subscription/PricingComparison.tsx
// Full comparison table of free vs pro features
```

---

## Webhook Handlers

### Stripe Webhooks

```typescript
// server/webhooks/stripe.ts

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      // New subscription created
      await handleCheckoutComplete(event.data.object);
      break;

    case 'customer.subscription.updated':
      // Subscription changed (upgrade, downgrade, renewal)
      await handleSubscriptionUpdate(event.data.object);
      break;

    case 'customer.subscription.deleted':
      // Subscription cancelled
      await handleSubscriptionCancelled(event.data.object);
      break;

    case 'invoice.payment_failed':
      // Payment failed - mark as past_due
      await handlePaymentFailed(event.data.object);
      break;

    case 'payment_intent.succeeded':
      // One-time payment (tokens/cosmetics)
      await handlePaymentSucceeded(event.data.object);
      break;
  }
}
```

### RevenueCat Webhooks (Mobile)

```typescript
// server/webhooks/revenuecat.ts

export async function handleRevenueCatWebhook(event: RevenueCatEvent) {
  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await handleMobilePurchase(event);
      break;

    case 'CANCELLATION':
    case 'EXPIRATION':
      await handleMobileExpiration(event);
      break;

    case 'PRODUCT_CHANGE':
      await handleMobileProductChange(event);
      break;
  }
}
```

---

## Products Configuration

### Stripe Products

```typescript
// config/stripe-products.ts

export const STRIPE_PRODUCTS = {
  subscriptions: {
    pro_monthly: {
      productId: 'prod_pro_monthly',
      priceId: 'price_pro_monthly',
      amount: 999, // $9.99
      interval: 'month',
    },
    pro_annual: {
      productId: 'prod_pro_annual',
      priceId: 'price_pro_annual',
      amount: 7999, // $79.99
      interval: 'year',
    },
  },

  tokenPacks: {
    ai_tokens_5: {
      productId: 'prod_ai_tokens_5',
      priceId: 'price_ai_tokens_5',
      amount: 499,
      tokens: { ai_tokens: 5 },
    },
    ai_tokens_15: {
      productId: 'prod_ai_tokens_15',
      priceId: 'price_ai_tokens_15',
      amount: 1199,
      tokens: { ai_tokens: 15 },
    },
    ai_tokens_50: {
      productId: 'prod_ai_tokens_50',
      priceId: 'price_ai_tokens_50',
      amount: 2999,
      tokens: { ai_tokens: 50 },
    },
    streak_shields_3: {
      productId: 'prod_shields_3',
      priceId: 'price_shields_3',
      amount: 299,
      tokens: { streak_shields: 3 },
    },
    streak_shields_10: {
      productId: 'prod_shields_10',
      priceId: 'price_shields_10',
      amount: 799,
      tokens: { streak_shields: 10 },
    },
    export_single: {
      productId: 'prod_export_1',
      priceId: 'price_export_1',
      amount: 199,
      tokens: { export_tokens: 1 },
    },
    export_5: {
      productId: 'prod_export_5',
      priceId: 'price_export_5',
      amount: 699,
      tokens: { export_tokens: 5 },
    },
  },
};
```

---

## Analytics Events

```typescript
// shared/analytics-events.ts

export const MONETIZATION_EVENTS = {
  // Subscription Events
  SUBSCRIPTION_PAGE_VIEWED: 'subscription_page_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_ABANDONED: 'checkout_abandoned',
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
  TRIAL_EXPIRED: 'trial_expired',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',

  // Token Events
  TOKEN_PURCHASE_STARTED: 'token_purchase_started',
  TOKEN_PURCHASE_COMPLETED: 'token_purchase_completed',
  TOKEN_USED: 'token_used',
  TOKEN_EARNED: 'token_earned',

  // Upsell Events
  UPSELL_SHOWN: 'upsell_shown',
  UPSELL_CLICKED: 'upsell_clicked',
  UPSELL_DISMISSED: 'upsell_dismissed',
  UPSELL_CONVERTED: 'upsell_converted',

  // Feature Gate Events
  FEATURE_LIMIT_HIT: 'feature_limit_hit',
  FEATURE_GATE_SHOWN: 'feature_gate_shown',

  // Cosmetic Events
  COSMETIC_VIEWED: 'cosmetic_viewed',
  COSMETIC_PURCHASED: 'cosmetic_purchased',
  COSMETIC_EQUIPPED: 'cosmetic_equipped',
};
```

---

## PDF Export for Healthcare Providers

### Overview

The PDF export feature generates comprehensive health reports for users to share with their healthcare providers. This is a **high-value monetization feature** (40% conversion on side effect export trigger) that pulls data from multiple tables to create a clinically useful document.

### Data Sources (Mapped to Schema)

The PDF report pulls from these tables in `shared/schema.ts`:

| Section | Source Table(s) | Key Fields |
|---------|-----------------|------------|
| Patient Info | `users` | firstName, lastName, dateOfBirth, gender, height, currentWeight, targetWeight |
| Medication Summary | `medications`, `doseEscalations` | medicationType, dosage, frequency, startDate, adherenceScore, escalation history |
| Side Effects | `medicationLogs` | nausea, vomiting, diarrhea, constipation, heartburn (0-5 scale), takenAt |
| Weight Progress | `weightLogs` | weight, bodyFat, muscleMass, loggedAt |
| Body Measurements | `bodyMeasurements` | waist, chest, hips, thigh, arm, neck, measuredAt |
| Nutrition Summary | `foodEntries` | Aggregated: avg calories, protein, carbs, fat per day |
| Appetite Response | `hungerLogs` | hungerBefore, hungerAfter, fullnessDuration, cravingIntensity |
| Adherence Metrics | `streaks`, `medicationLogs` | medication streak, tracking consistency, adherence % |
| Goals Progress | `userGoals` | goalType, targetValue, currentValue, progress % |

### Report Sections

```typescript
// server/services/pdf-export.ts

interface HealthcareProviderReport {
  // Header
  generatedAt: Date;
  reportPeriod: { start: Date; end: Date };

  // Section 1: Patient Demographics
  patient: {
    name: string;
    dateOfBirth: Date;
    age: number;
    gender: string;
    height: { value: number; unit: 'cm' | 'in' };
  };

  // Section 2: Medication Overview
  medication: {
    type: 'ozempic' | 'mounjaro' | 'wegovy' | 'rybelsus';
    currentDose: string;
    frequency: 'weekly' | 'daily';
    startDate: Date;
    weeksOnMedication: number;
    overallAdherenceScore: number; // 0-100%
    doseEscalationHistory: {
      date: Date;
      previousDose: string;
      newDose: string;
      reason?: string;
    }[];
  };

  // Section 3: Side Effects Profile
  sideEffects: {
    reportingPeriod: string;
    summary: {
      nausea: { average: number; trend: 'improving' | 'stable' | 'worsening' };
      vomiting: { average: number; trend: string };
      diarrhea: { average: number; trend: string };
      constipation: { average: number; trend: string };
      heartburn: { average: number; trend: string };
    };
    // Last 4 weeks of injection logs with side effects
    weeklyBreakdown: {
      weekOf: Date;
      dose: string;
      sideEffectScores: Record<string, number>;
      notes?: string;
    }[];
  };

  // Section 4: Weight & Body Composition
  weightProgress: {
    startWeight: number;
    currentWeight: number;
    targetWeight: number;
    totalLost: number;
    percentToGoal: number;
    weeklyAverage: number; // lbs/week lost
    trend: Array<{ date: Date; weight: number }>;
    bodyComposition?: {
      bodyFatStart?: number;
      bodyFatCurrent?: number;
      muscleMassStart?: number;
      muscleMassCurrent?: number;
    };
  };

  // Section 5: Body Measurements (if available)
  measurements?: {
    current: Record<'waist' | 'chest' | 'hips' | 'thigh' | 'arm' | 'neck', number>;
    change: Record<string, number>; // Change from first measurement
    measurementDate: Date;
  };

  // Section 6: Nutrition Summary
  nutrition: {
    averageDailyCalories: number;
    averageDailyProtein: number;
    averageDailyCarbs: number;
    averageDailyFat: number;
    trackingConsistency: number; // % of days tracked
    comparedToTarget: {
      calories: { target: number; actual: number; variance: number };
      protein: { target: number; actual: number; variance: number };
    };
  };

  // Section 7: Appetite & Satiety Response
  appetiteResponse: {
    averageHungerBefore: number; // 1-10
    averageHungerAfter: number;  // 1-10
    appetiteSuppression: number; // % reduction
    averageFullnessDuration: number; // hours
    cravingFrequency: 'rare' | 'occasional' | 'frequent';
    dominantCravingType?: 'sweet' | 'salty' | 'savory';
  };

  // Section 8: Adherence & Engagement
  adherence: {
    medicationAdherence: number; // %
    trackingStreak: number; // days
    longestStreak: number;
    missedDoses: number;
    consistencyScore: number; // Composite score
  };

  // Section 9: Goals & Recommendations
  goals: {
    active: Array<{
      type: string;
      target: number;
      current: number;
      unit: string;
      progressPercent: number;
    }>;
    achieved: string[];
  };
}
```

### API Endpoint

```typescript
// server/routes/exports.ts

// POST /api/exports/healthcare-pdf
interface GeneratePdfRequest {
  reportPeriod: '30days' | '60days' | '90days' | 'all';
  sections?: string[]; // Optional: specific sections to include
  format?: 'detailed' | 'summary'; // Default: detailed
}

interface GeneratePdfResponse {
  // If user has export tokens or Pro subscription
  success: true;
  downloadUrl: string; // Signed URL, expires in 1 hour
  expiresAt: string;

  // If user needs to purchase
  success: false;
  reason: 'no_tokens';
  tokensRequired: 1;
  upsellOptions: {
    singleExport: { price: 199, productId: string };
    fivePack: { price: 699, productId: string };
    proPlan: { price: 999, includesExports: 5 };
  };
}
```

### PDF Generation Service

```typescript
// server/services/pdf-generator.ts

import PDFDocument from 'pdfkit';

export class HealthcarePdfGenerator {
  async generateReport(
    userId: string,
    options: { period: string; format: string }
  ): Promise<Buffer> {

    // 1. Fetch all required data in parallel
    const [
      user,
      medications,
      medicationLogs,
      doseEscalations,
      weightLogs,
      bodyMeasurements,
      foodEntries,
      hungerLogs,
      streaks,
      goals
    ] = await Promise.all([
      this.storage.getUser(userId),
      this.storage.getMedications(userId),
      this.storage.getMedicationLogs(userId, options.period),
      this.storage.getDoseEscalations(userId),
      this.storage.getWeightLogs(userId, options.period),
      this.storage.getBodyMeasurements(userId),
      this.storage.getFoodEntries(userId, options.period),
      this.storage.getHungerLogs(userId, options.period),
      this.storage.getStreaks(userId),
      this.storage.getUserGoals(userId)
    ]);

    // 2. Transform into report structure
    const report = this.buildReportData({
      user, medications, medicationLogs, doseEscalations,
      weightLogs, bodyMeasurements, foodEntries, hungerLogs,
      streaks, goals
    });

    // 3. Generate PDF
    return this.renderPdf(report, options.format);
  }

  private calculateSideEffectTrends(logs: MedicationLog[]): SideEffectSummary {
    // Compare last 2 weeks vs previous 2 weeks
    const recent = logs.filter(l => isWithinLastNDays(l.takenAt, 14));
    const previous = logs.filter(l =>
      isWithinLastNDays(l.takenAt, 28) && !isWithinLastNDays(l.takenAt, 14)
    );

    const effects = ['nausea', 'vomiting', 'diarrhea', 'constipation', 'heartburn'];

    return effects.reduce((acc, effect) => {
      const recentAvg = average(recent.map(l => l[effect] || 0));
      const previousAvg = average(previous.map(l => l[effect] || 0));

      acc[effect] = {
        average: recentAvg,
        trend: recentAvg < previousAvg - 0.5 ? 'improving' :
               recentAvg > previousAvg + 0.5 ? 'worsening' : 'stable'
      };
      return acc;
    }, {});
  }

  private calculateAppetiteResponse(hungerLogs: HungerLog[]): AppetiteResponse {
    const avgBefore = average(hungerLogs.map(l => l.hungerBefore));
    const avgAfter = average(hungerLogs.map(l => l.hungerAfter));

    return {
      averageHungerBefore: round(avgBefore, 1),
      averageHungerAfter: round(avgAfter, 1),
      appetiteSuppression: round((avgBefore - avgAfter) / avgBefore * 100, 0),
      averageFullnessDuration: round(average(hungerLogs.map(l => l.fullnessDuration)), 1),
      cravingFrequency: this.categorizeCravingFrequency(hungerLogs),
      dominantCravingType: this.findDominantCravingType(hungerLogs)
    };
  }
}
```

### PDF Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│  SEMASLIM HEALTH REPORT                                     │
│  Patient Progress Summary for Healthcare Provider           │
│                                                             │
│  Generated: January 21, 2026                                │
│  Report Period: December 22, 2025 - January 21, 2026        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PATIENT INFORMATION                                        │
│  ──────────────────                                         │
│  Name: Jane Smith              DOB: March 15, 1985 (40y)   │
│  Height: 5'6" (168 cm)         Starting Weight: 195 lbs    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MEDICATION SUMMARY                                         │
│  ──────────────────                                         │
│  Medication: Ozempic (semaglutide)                         │
│  Current Dose: 1.0 mg weekly                               │
│  Treatment Duration: 16 weeks                               │
│  Overall Adherence: 94%                                     │
│                                                             │
│  Dose Escalation History:                                   │
│  • Week 1-4:   0.25 mg (initiation)                        │
│  • Week 5-8:   0.5 mg                                      │
│  • Week 9+:    1.0 mg (current)                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SIDE EFFECTS (Last 30 Days)                               │
│  ──────────────────────────                                 │
│                     Avg Score (0-5)    Trend               │
│  Nausea:                 1.2          ↓ Improving          │
│  Vomiting:               0.1          → Stable             │
│  Diarrhea:               0.8          ↓ Improving          │
│  Constipation:           1.5          → Stable             │
│  Heartburn:              0.3          → Stable             │
│                                                             │
│  Notes: Side effects well-tolerated. Nausea decreased      │
│  significantly after week 4.                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WEIGHT PROGRESS                                            │
│  ───────────────                                            │
│  Starting Weight:    195.0 lbs     Target: 155 lbs         │
│  Current Weight:     178.5 lbs     To Goal: 23.5 lbs       │
│  Total Lost:         16.5 lbs (8.5% body weight)           │
│  Weekly Average:     1.0 lbs/week                          │
│                                                             │
│  [Weight Trend Chart - 30 day line graph]                  │
│                                                             │
│  Body Composition (if available):                          │
│  • Body Fat: 38% → 34% (-4%)                               │
│  • Muscle Mass: Maintained                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NUTRITION SUMMARY (Daily Averages)                        │
│  ──────────────────────────────────                         │
│  Calories:  1,450 / 1,500 target (97%)                     │
│  Protein:   95g / 100g target (95%)                        │
│  Carbs:     145g                                            │
│  Fat:       52g                                             │
│                                                             │
│  Tracking Consistency: 89% of days logged                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  APPETITE RESPONSE TO MEDICATION                           │
│  ───────────────────────────────                            │
│  Pre-meal Hunger (avg):    6.2 / 10                        │
│  Post-meal Hunger (avg):   2.1 / 10                        │
│  Appetite Suppression:     66% reduction                   │
│  Avg Fullness Duration:    4.2 hours                       │
│  Cravings:                 Occasional (mostly sweet)       │
│                                                             │
│  Interpretation: Strong appetite response to medication.   │
│  Patient reports sustained fullness between meals.         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ADHERENCE & ENGAGEMENT                                     │
│  ──────────────────────                                     │
│  Medication Doses Taken:   13/14 (93%)                     │
│  Tracking Streak:          18 days (current)               │
│  Longest Streak:           32 days                         │
│  Consistency Score:        A (Excellent)                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GOALS PROGRESS                                             │
│  ──────────────                                             │
│  ✓ Lose 15 lbs - ACHIEVED (16.5 lbs lost)                 │
│  ◐ Reach 170 lbs - 72% complete                           │
│  ◐ Daily protein 100g - 95% average                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This report was generated by SemaSlim, a patient-managed  │
│  GLP-1 medication companion app. Data is self-reported.    │
│                                                             │
│  For questions: support@semaslim.com                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Storage Queries for PDF Export

```typescript
// server/storage.ts - Add these methods to IStorage interface

interface IStorage {
  // Existing methods...

  // PDF Export specific queries
  getMedicationLogsForExport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MedicationLogWithDetails[]>;

  getWeightLogsForExport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WeightLog[]>;

  getAggregatedNutrition(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    daysTracked: number;
    totalDays: number;
  }>;

  getHungerLogsForExport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HungerLog[]>;
}
```

### Export Token Consumption Flow

```typescript
// server/routes/exports.ts

router.post('/healthcare-pdf', requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const { reportPeriod, sections, format } = req.body;

  // 1. Check entitlements
  const entitlements = await entitlementsService.getUserEntitlements(userId);

  // Pro users with included exports
  if (entitlements.tier === 'pro' && entitlements.pdfExportsIncluded > 0) {
    // Consume from Pro allowance
    await entitlementsService.consumeProExport(userId);
  }
  // Users with purchased export tokens
  else if (entitlements.exportTokens > 0) {
    await tokenService.consumeToken(userId, 'export_tokens', 1, 'pdf_export');
  }
  // No access - return upsell
  else {
    // Track upsell event
    await analyticsService.track('FEATURE_LIMIT_HIT', {
      userId,
      feature: 'pdf_export',
      trigger: 'healthcare_pdf_attempt'
    });

    return res.status(402).json({
      success: false,
      reason: 'no_tokens',
      tokensRequired: 1,
      upsellOptions: {
        singleExport: { price: 199, productId: 'prod_export_1' },
        fivePack: { price: 699, productId: 'prod_export_5' },
        proPlan: { price: 999, includesExports: 5 }
      }
    });
  }

  // 2. Generate PDF
  const pdfBuffer = await pdfGenerator.generateReport(userId, {
    period: reportPeriod,
    format: format || 'detailed'
  });

  // 3. Upload to temporary storage and return signed URL
  const downloadUrl = await storageService.uploadTemporaryFile(
    pdfBuffer,
    `health-report-${userId}-${Date.now()}.pdf`,
    { expiresIn: 3600 } // 1 hour
  );

  // 4. Track successful export
  await analyticsService.track('PDF_EXPORT_COMPLETED', {
    userId,
    reportPeriod,
    format
  });

  res.json({
    success: true,
    downloadUrl,
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  });
});
```

---

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat (Mobile)
REVENUECAT_API_KEY=appl_...
REVENUECAT_WEBHOOK_SECRET=...

# Feature Flags
MONETIZATION_ENABLED=true
TRIAL_LENGTH_DAYS=7
SHOW_ANNUAL_PLAN=true
TOKEN_PURCHASES_ENABLED=true
COSMETICS_SHOP_ENABLED=false

# Pricing (overrides)
PRO_MONTHLY_PRICE_CENTS=999
PRO_ANNUAL_PRICE_CENTS=7999
```

---

## Migration Plan

### Step 1: Database Migration

```sql
-- migrations/001_add_monetization_tables.sql

-- Run all CREATE TABLE statements from above

-- Add subscription column to users for quick access
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';

-- Create initial token balances for existing users
INSERT INTO token_balances (user_id, ai_tokens, export_tokens, streak_shields)
SELECT id, 0, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;
```

### Step 2: Backfill Pro Trials for Active Users

```typescript
// scripts/backfill-trials.ts

// Give existing active users a 7-day pro trial as a thank-you
async function backfillTrials() {
  const activeUsers = await db.query(`
    SELECT id FROM users
    WHERE last_active_at > NOW() - INTERVAL '30 days'
  `);

  for (const user of activeUsers) {
    await createTrialSubscription(user.id, 7);
  }
}
```

---

## Testing Checklist

- [ ] Free user can access all free features
- [ ] Free user hits feature limits correctly
- [ ] Trial creation and expiration works
- [ ] Stripe checkout flow completes
- [ ] Webhook handling is idempotent
- [ ] Token purchase and consumption works
- [ ] Streak shield activation works
- [ ] Downgrade from Pro preserves data
- [ ] RevenueCat mobile purchases sync
- [ ] Upsell frequency caps work
- [ ] Analytics events fire correctly

---

This specification should be updated as implementation progresses and requirements evolve.
