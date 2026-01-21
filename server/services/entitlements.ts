import { db } from "../db";
import { eq, and, sql, gte } from "drizzle-orm";
import {
  subscriptions,
  tokenBalances,
  featureUsage,
  type Subscription,
  type TokenBalance,
} from "@shared/schema";
import {
  TIER_LIMITS,
  type FeatureLimits,
  type UserEntitlements,
  FEATURE_TYPES,
  type FeatureType,
} from "@shared/features";

export class EntitlementsService {
  /**
   * Get user's complete entitlements including subscription, limits, and current usage
   */
  async getUserEntitlements(userId: string): Promise<UserEntitlements> {
    const [subscription, tokenBalance, todayUsage, monthlyUsage] = await Promise.all([
      this.getSubscription(userId),
      this.getOrCreateTokenBalance(userId),
      this.getTodayUsage(userId),
      this.getMonthlyUsage(userId),
    ]);

    const tier = this.determineTier(subscription);
    const limits = TIER_LIMITS[tier];
    const isTrialing = subscription?.status === 'trialing';
    const trialDaysRemaining = this.calculateTrialDays(subscription);

    return {
      tier,
      isTrialing,
      trialDaysRemaining,
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelledAt !== null && subscription?.status === 'active',

      // Limits from tier
      ...limits,

      // Current usage
      aiMealPlansUsed: monthlyUsage.aiMealPlans + (tokenBalance?.aiTokensMonthlyUsed ?? 0),
      aiRecipeSuggestionsUsed: monthlyUsage.aiRecipes,
      barcodeScansToday: todayUsage.barcodeScans,
      pdfExportsUsed: tokenBalance?.exportsMonthlyUsed ?? 0,

      // Token balances
      aiTokens: tokenBalance?.aiTokens ?? 0,
      exportTokens: tokenBalance?.exportTokens ?? 0,
      streakShields: tokenBalance?.streakShields ?? 0,
    };
  }

  /**
   * Check if a user can use a specific feature
   */
  async canUseFeature(
    userId: string,
    feature: FeatureType,
    quantity: number = 1
  ): Promise<{ allowed: boolean; reason?: string; upsellType?: string; remaining?: number }> {
    const entitlements = await this.getUserEntitlements(userId);

    switch (feature) {
      case FEATURE_TYPES.AI_MEAL_PLAN: {
        const monthlyLimit = entitlements.aiMealPlansPerMonth;
        const used = entitlements.aiMealPlansUsed;
        const remaining = monthlyLimit - used;

        // Check monthly allowance first
        if (remaining >= quantity) {
          return { allowed: true, remaining };
        }

        // Check if user has purchased tokens
        if (entitlements.aiTokens >= quantity) {
          return { allowed: true, remaining: entitlements.aiTokens };
        }

        return {
          allowed: false,
          reason: 'ai_meal_plan_limit_reached',
          upsellType: entitlements.tier === 'free' ? 'pro_or_tokens' : 'tokens',
          remaining: 0,
        };
      }

      case FEATURE_TYPES.AI_RECIPE: {
        const monthlyLimit = entitlements.aiRecipeSuggestionsPerMonth;
        const used = entitlements.aiRecipeSuggestionsUsed;
        const remaining = monthlyLimit - used;

        if (remaining >= quantity) {
          return { allowed: true, remaining };
        }

        if (entitlements.aiTokens >= quantity) {
          return { allowed: true, remaining: entitlements.aiTokens };
        }

        return {
          allowed: false,
          reason: 'ai_recipe_limit_reached',
          upsellType: entitlements.tier === 'free' ? 'pro_or_tokens' : 'tokens',
          remaining: 0,
        };
      }

      case FEATURE_TYPES.BARCODE_SCAN: {
        const dailyLimit = entitlements.barcodeScansPerDay;

        // Pro users have unlimited (-1)
        if (dailyLimit === -1) {
          return { allowed: true, remaining: -1 };
        }

        const used = entitlements.barcodeScansToday;
        const remaining = dailyLimit - used;

        if (remaining >= quantity) {
          return { allowed: true, remaining };
        }

        return {
          allowed: false,
          reason: 'barcode_scan_limit_reached',
          upsellType: 'pro',
          remaining: 0,
        };
      }

      case FEATURE_TYPES.PDF_EXPORT: {
        // Pro users have monthly allowance
        if (entitlements.tier === 'pro') {
          const proRemaining = entitlements.pdfExportsIncluded - entitlements.pdfExportsUsed;
          if (proRemaining >= quantity) {
            return { allowed: true, remaining: proRemaining };
          }
        }

        // Check for purchased export tokens
        if (entitlements.exportTokens >= quantity) {
          return { allowed: true, remaining: entitlements.exportTokens };
        }

        return {
          allowed: false,
          reason: 'no_export_tokens',
          upsellType: entitlements.tier === 'free' ? 'pro_or_export_tokens' : 'export_tokens',
          remaining: 0,
        };
      }

      default:
        return { allowed: true };
    }
  }

  /**
   * Consume a feature usage (record usage and deduct tokens if needed)
   */
  async consumeFeature(
    userId: string,
    feature: FeatureType,
    quantity: number = 1,
    useTokens: boolean = false
  ): Promise<{ success: boolean; tokensUsed: boolean; newBalance?: number }> {
    const canUse = await this.canUseFeature(userId, feature, quantity);

    if (!canUse.allowed) {
      return { success: false, tokensUsed: false };
    }

    const today = new Date().toISOString().split('T')[0];

    // Record the usage
    await db.insert(featureUsage)
      .values({
        userId,
        featureType: feature,
        usageDate: today,
        usageCount: quantity,
      })
      .onConflictDoUpdate({
        target: [featureUsage.userId, featureUsage.usageDate, featureUsage.featureType],
        set: {
          usageCount: sql`${featureUsage.usageCount} + ${quantity}`,
          updatedAt: new Date(),
        },
      });

    // Deduct tokens if using purchased tokens
    if (useTokens && (feature === FEATURE_TYPES.AI_MEAL_PLAN || feature === FEATURE_TYPES.AI_RECIPE)) {
      await this.deductTokens(userId, 'ai_tokens', quantity);
      const balance = await this.getOrCreateTokenBalance(userId);
      return { success: true, tokensUsed: true, newBalance: balance.aiTokens };
    }

    if (useTokens && feature === FEATURE_TYPES.PDF_EXPORT) {
      await this.deductTokens(userId, 'export_tokens', quantity);
      const balance = await this.getOrCreateTokenBalance(userId);
      return { success: true, tokensUsed: true, newBalance: balance.exportTokens };
    }

    return { success: true, tokensUsed: false };
  }

  /**
   * Use a streak shield
   */
  async useStreakShield(userId: string): Promise<{ success: boolean; remaining: number }> {
    const balance = await this.getOrCreateTokenBalance(userId);
    const entitlements = await this.getUserEntitlements(userId);

    // Check for Pro monthly shields first
    if (entitlements.tier === 'pro') {
      const monthlyUsed = balance.streakShieldsMonthlyUsed;
      if (monthlyUsed < entitlements.monthlyStreakShields) {
        await db.update(tokenBalances)
          .set({
            streakShieldsMonthlyUsed: monthlyUsed + 1,
            updatedAt: new Date(),
          })
          .where(eq(tokenBalances.userId, userId));

        return {
          success: true,
          remaining: entitlements.monthlyStreakShields - monthlyUsed - 1 + balance.streakShields,
        };
      }
    }

    // Use purchased shields
    if (balance.streakShields > 0) {
      await this.deductTokens(userId, 'streak_shields', 1);
      return {
        success: true,
        remaining: balance.streakShields - 1,
      };
    }

    return { success: false, remaining: 0 };
  }

  /**
   * Add tokens to user's balance (after purchase or reward)
   */
  async addTokens(
    userId: string,
    tokenType: 'ai_tokens' | 'export_tokens' | 'streak_shields',
    amount: number,
    source: 'purchase' | 'subscription' | 'reward',
    sourceReference?: string
  ): Promise<TokenBalance> {
    const balance = await this.getOrCreateTokenBalance(userId);

    const updateField = {
      ai_tokens: 'aiTokens',
      export_tokens: 'exportTokens',
      streak_shields: 'streakShields',
    }[tokenType] as 'aiTokens' | 'exportTokens' | 'streakShields';

    const newBalance = (balance[updateField] ?? 0) + amount;

    await db.update(tokenBalances)
      .set({
        [updateField]: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(tokenBalances.userId, userId));

    // Record transaction
    const { tokenTransactions } = await import("@shared/schema");
    await db.insert(tokenTransactions).values({
      userId,
      tokenType,
      amount,
      balanceAfter: newBalance,
      source,
      sourceReference,
      description: `Added ${amount} ${tokenType.replace('_', ' ')}`,
    });

    return { ...balance, [updateField]: newBalance };
  }

  /**
   * Deduct tokens from user's balance
   */
  private async deductTokens(
    userId: string,
    tokenType: 'ai_tokens' | 'export_tokens' | 'streak_shields',
    amount: number
  ): Promise<void> {
    const balance = await this.getOrCreateTokenBalance(userId);

    const updateField = {
      ai_tokens: 'aiTokens',
      export_tokens: 'exportTokens',
      streak_shields: 'streakShields',
    }[tokenType] as 'aiTokens' | 'exportTokens' | 'streakShields';

    const newBalance = Math.max(0, (balance[updateField] ?? 0) - amount);

    await db.update(tokenBalances)
      .set({
        [updateField]: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(tokenBalances.userId, userId));

    // Record transaction
    const { tokenTransactions } = await import("@shared/schema");
    await db.insert(tokenTransactions).values({
      userId,
      tokenType,
      amount: -amount,
      balanceAfter: newBalance,
      source: 'usage',
      description: `Used ${amount} ${tokenType.replace('_', ' ')}`,
    });
  }

  /**
   * Reset monthly usage counters (call on subscription renewal)
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    await db.update(tokenBalances)
      .set({
        aiTokensMonthlyUsed: 0,
        exportsMonthlyUsed: 0,
        streakShieldsMonthlyUsed: 0,
        monthlyResetDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(eq(tokenBalances.userId, userId));
  }

  // Helper methods

  private async getSubscription(userId: string): Promise<Subscription | null> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return subscription ?? null;
  }

  private async getOrCreateTokenBalance(userId: string): Promise<TokenBalance> {
    const [existing] = await db.select()
      .from(tokenBalances)
      .where(eq(tokenBalances.userId, userId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new balance
    const [created] = await db.insert(tokenBalances)
      .values({ userId })
      .returning();

    return created;
  }

  private async getTodayUsage(userId: string): Promise<{ barcodeScans: number }> {
    const today = new Date().toISOString().split('T')[0];

    const [usage] = await db.select({
      count: sql<number>`COALESCE(SUM(${featureUsage.usageCount}), 0)`,
    })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureType, FEATURE_TYPES.BARCODE_SCAN),
          eq(featureUsage.usageDate, today)
        )
      );

    return { barcodeScans: Number(usage?.count ?? 0) };
  }

  private async getMonthlyUsage(userId: string): Promise<{ aiMealPlans: number; aiRecipes: number }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [aiMealPlanUsage] = await db.select({
      count: sql<number>`COALESCE(SUM(${featureUsage.usageCount}), 0)`,
    })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureType, FEATURE_TYPES.AI_MEAL_PLAN),
          gte(featureUsage.usageDate, startOfMonth.toISOString().split('T')[0])
        )
      );

    const [aiRecipeUsage] = await db.select({
      count: sql<number>`COALESCE(SUM(${featureUsage.usageCount}), 0)`,
    })
      .from(featureUsage)
      .where(
        and(
          eq(featureUsage.userId, userId),
          eq(featureUsage.featureType, FEATURE_TYPES.AI_RECIPE),
          gte(featureUsage.usageDate, startOfMonth.toISOString().split('T')[0])
        )
      );

    return {
      aiMealPlans: Number(aiMealPlanUsage?.count ?? 0),
      aiRecipes: Number(aiRecipeUsage?.count ?? 0),
    };
  }

  private determineTier(subscription: Subscription | null): 'free' | 'pro' {
    if (!subscription) return 'free';

    // Active or trialing Pro subscription
    if (subscription.tier === 'pro' && ['active', 'trialing'].includes(subscription.status)) {
      return 'pro';
    }

    // Past due but still within grace period (treat as Pro)
    if (subscription.tier === 'pro' && subscription.status === 'past_due') {
      return 'pro';
    }

    return 'free';
  }

  private calculateTrialDays(subscription: Subscription | null): number | null {
    if (!subscription || subscription.status !== 'trialing' || !subscription.trialEndDate) {
      return null;
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
}

// Export singleton instance
export const entitlementsService = new EntitlementsService();
