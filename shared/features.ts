// Feature limits configuration for SemaSlim monetization tiers

export interface FeatureLimits {
  // AI Features
  aiMealPlansPerMonth: number;
  aiRecipeSuggestionsPerMonth: number;

  // Food Tracking
  barcodeScansPerDay: number;
  foodDatabaseTier: 'basic' | 'extended' | 'premium';

  // Data & History
  historyRetentionDays: number; // -1 for unlimited

  // Gamification
  achievementsAvailable: number; // -1 for unlimited
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
    aiRecipeSuggestionsPerMonth: 2,
    barcodeScansPerDay: 10,
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
    barcodeScansPerDay: -1, // unlimited
    foodDatabaseTier: 'premium',
    historyRetentionDays: -1, // unlimited
    achievementsAvailable: -1, // unlimited
    monthlyStreakShields: 2,
    pdfExportsIncluded: 5,
    dataExportEnabled: true,
    familySharingSlots: 3,
  },
};

// User entitlements interface (extends limits with current state)
export interface UserEntitlements extends FeatureLimits {
  tier: 'free' | 'pro';
  isTrialing: boolean;
  trialDaysRemaining: number | null;

  // Current usage this period
  aiMealPlansUsed: number;
  aiRecipeSuggestionsUsed: number;
  barcodeScansToday: number;
  pdfExportsUsed: number;

  // Token balances (purchased or earned)
  aiTokens: number;
  exportTokens: number;
  streakShields: number;

  // Subscription info
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

// Product definitions for Stripe/RevenueCat
export interface ProductConfig {
  id: string;
  name: string;
  description: string;
  priceId?: string; // Stripe price ID
  revenuecatProductId?: string;
  amount: number; // in cents
  tokens?: {
    ai_tokens?: number;
    export_tokens?: number;
    streak_shields?: number;
  };
}

export const SUBSCRIPTION_PRODUCTS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'SemaSlim Pro Monthly',
    description: 'Full access to all Pro features, billed monthly',
    amount: 999, // $9.99
    interval: 'month' as const,
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'SemaSlim Pro Annual',
    description: 'Full access to all Pro features, save 33%',
    amount: 7999, // $79.99
    interval: 'year' as const,
  },
};

export const TOKEN_PRODUCTS: Record<string, ProductConfig> = {
  ai_tokens_5: {
    id: 'ai_tokens_5',
    name: '5 AI Tokens',
    description: 'Generate 5 AI meal plans or recipe suggestions',
    amount: 499,
    tokens: { ai_tokens: 5 },
  },
  ai_tokens_15: {
    id: 'ai_tokens_15',
    name: '15 AI Tokens',
    description: 'Save 20% - Best value for regular AI users',
    amount: 1199,
    tokens: { ai_tokens: 15 },
  },
  ai_tokens_50: {
    id: 'ai_tokens_50',
    name: '50 AI Tokens',
    description: 'Save 40% - For power users',
    amount: 2999,
    tokens: { ai_tokens: 50 },
  },
  streak_shields_3: {
    id: 'streak_shields_3',
    name: '3 Streak Shields',
    description: 'Protect your streak during busy days',
    amount: 299,
    tokens: { streak_shields: 3 },
  },
  streak_shields_10: {
    id: 'streak_shields_10',
    name: '10 Streak Shields',
    description: 'Save 20% - Never lose a streak again',
    amount: 799,
    tokens: { streak_shields: 10 },
  },
  export_single: {
    id: 'export_single',
    name: 'Single PDF Export',
    description: 'Generate one healthcare provider report',
    amount: 199,
    tokens: { export_tokens: 1 },
  },
  export_5: {
    id: 'export_5',
    name: '5 PDF Exports',
    description: 'Perfect for quarterly doctor visits',
    amount: 699,
    tokens: { export_tokens: 5 },
  },
};

// Feature type constants for usage tracking
export const FEATURE_TYPES = {
  BARCODE_SCAN: 'barcode_scan',
  AI_MEAL_PLAN: 'ai_meal_plan',
  AI_RECIPE: 'ai_recipe',
  PDF_EXPORT: 'pdf_export',
} as const;

export type FeatureType = typeof FEATURE_TYPES[keyof typeof FEATURE_TYPES];

// Upsell trigger types
export const UPSELL_TRIGGERS = {
  AI_LIMIT: 'ai_limit',
  BARCODE_LIMIT: 'barcode_limit',
  HISTORY_LIMIT: 'history_limit',
  STREAK_RISK: 'streak_risk',
  WEIGHT_MILESTONE: 'weight_milestone',
  ACHIEVEMENT_UNLOCK: 'achievement_unlock',
  SIDE_EFFECT_EXPORT: 'side_effect_export',
  MONTHLY_RENEWAL: 'monthly_renewal',
} as const;

export type UpsellTrigger = typeof UPSELL_TRIGGERS[keyof typeof UPSELL_TRIGGERS];
