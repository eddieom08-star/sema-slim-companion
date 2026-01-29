import { db, pool } from "../db";
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
  type UserEntitlements,
  FEATURE_TYPES,
  type FeatureType,
} from "@shared/features";
import { entitlementsCache, CacheKeys, invalidateUserCaches } from "../lib/cache";

export class EntitlementsService {
  /**
   * Get user's complete entitlements including subscription, limits, and current usage
   * Uses in-memory cache with 60-second TTL to reduce database queries
   */
  async getUserEntitlements(userId: string, skipCache: boolean = false): Promise<UserEntitlements> {
    const cacheKey = CacheKeys.entitlements(userId);

    // Check cache first (unless explicitly skipped)
    if (!skipCache) {
      const cached = entitlementsCache.get(cacheKey);
      if (cached) {
        return cached as UserEntitlements;
      }
    }

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

    const entitlements: UserEntitlements = {
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

    // Cache the result
    entitlementsCache.set(cacheKey, entitlements);

    return entitlements;
  }

  /**
   * Invalidate all caches for a user (call after mutations)
   */
  invalidateCache(userId: string): void {
    invalidateUserCaches(userId);
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
   * Consume a feature usage atomically (record usage and deduct tokens if needed)
   * Uses database transaction to prevent race conditions
   */
  async consumeFeature(
    userId: string,
    feature: FeatureType,
    quantity: number = 1,
    useTokens: boolean = false
  ): Promise<{ success: boolean; tokensUsed: boolean; newBalance?: number }> {
    const today = new Date().toISOString().split('T')[0];

    // Use raw SQL transaction for atomic check-and-consume
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current entitlements with row lock on token_balances
      const entitlements = await this.getUserEntitlementsWithLock(userId, client);

      // Check if feature can be used
      const canUseResult = this.checkFeatureAllowance(entitlements, feature, quantity);
      if (!canUseResult.allowed) {
        await client.query('ROLLBACK');
        return { success: false, tokensUsed: false };
      }

      // Atomically record usage with INSERT ... ON CONFLICT
      await client.query(`
        INSERT INTO feature_usage (id, user_id, feature_type, usage_date, usage_count, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id, usage_date, feature_type)
        DO UPDATE SET usage_count = feature_usage.usage_count + $4, updated_at = NOW()
      `, [userId, feature, today, quantity]);

      // Deduct tokens if using purchased tokens
      let tokensUsed = false;
      let newBalance: number | undefined;

      if (useTokens && (feature === FEATURE_TYPES.AI_MEAL_PLAN || feature === FEATURE_TYPES.AI_RECIPE)) {
        const result = await this.deductTokensAtomic(userId, 'ai_tokens', quantity, client);
        if (result.success) {
          tokensUsed = true;
          newBalance = result.newBalance;
        }
      } else if (useTokens && feature === FEATURE_TYPES.PDF_EXPORT) {
        const result = await this.deductTokensAtomic(userId, 'export_tokens', quantity, client);
        if (result.success) {
          tokensUsed = true;
          newBalance = result.newBalance;
        }
      }

      await client.query('COMMIT');

      // Invalidate cache after successful consumption
      this.invalidateCache(userId);

      return { success: true, tokensUsed, newBalance };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check feature allowance without database calls (pure logic)
   */
  private checkFeatureAllowance(
    entitlements: UserEntitlements,
    feature: FeatureType,
    quantity: number
  ): { allowed: boolean; reason?: string; upsellType?: string; remaining?: number } {
    switch (feature) {
      case FEATURE_TYPES.AI_MEAL_PLAN: {
        const monthlyLimit = entitlements.aiMealPlansPerMonth;
        const used = entitlements.aiMealPlansUsed;
        const remaining = monthlyLimit - used;
        if (remaining >= quantity) return { allowed: true, remaining };
        if (entitlements.aiTokens >= quantity) return { allowed: true, remaining: entitlements.aiTokens };
        return { allowed: false, reason: 'ai_meal_plan_limit_reached', upsellType: entitlements.tier === 'free' ? 'pro_or_tokens' : 'tokens', remaining: 0 };
      }
      case FEATURE_TYPES.AI_RECIPE: {
        const monthlyLimit = entitlements.aiRecipeSuggestionsPerMonth;
        const used = entitlements.aiRecipeSuggestionsUsed;
        const remaining = monthlyLimit - used;
        if (remaining >= quantity) return { allowed: true, remaining };
        if (entitlements.aiTokens >= quantity) return { allowed: true, remaining: entitlements.aiTokens };
        return { allowed: false, reason: 'ai_recipe_limit_reached', upsellType: entitlements.tier === 'free' ? 'pro_or_tokens' : 'tokens', remaining: 0 };
      }
      case FEATURE_TYPES.BARCODE_SCAN: {
        const dailyLimit = entitlements.barcodeScansPerDay;
        if (dailyLimit === -1) return { allowed: true, remaining: -1 };
        const used = entitlements.barcodeScansToday;
        const remaining = dailyLimit - used;
        if (remaining >= quantity) return { allowed: true, remaining };
        return { allowed: false, reason: 'barcode_scan_limit_reached', upsellType: 'pro', remaining: 0 };
      }
      case FEATURE_TYPES.PDF_EXPORT: {
        if (entitlements.tier === 'pro') {
          const proRemaining = entitlements.pdfExportsIncluded - entitlements.pdfExportsUsed;
          if (proRemaining >= quantity) return { allowed: true, remaining: proRemaining };
        }
        if (entitlements.exportTokens >= quantity) return { allowed: true, remaining: entitlements.exportTokens };
        return { allowed: false, reason: 'no_export_tokens', upsellType: entitlements.tier === 'free' ? 'pro_or_export_tokens' : 'export_tokens', remaining: 0 };
      }
      default:
        return { allowed: true };
    }
  }

  /**
   * Get user entitlements with row lock for transaction safety
   */
  private async getUserEntitlementsWithLock(userId: string, client: any): Promise<UserEntitlements> {
    // Lock token_balances row to prevent concurrent modifications
    const balanceResult = await client.query(`
      SELECT * FROM token_balances WHERE user_id = $1 FOR UPDATE
    `, [userId]);

    let tokenBalance = balanceResult.rows[0];
    if (!tokenBalance) {
      // Create new balance within transaction
      const insertResult = await client.query(`
        INSERT INTO token_balances (user_id) VALUES ($1) RETURNING *
      `, [userId]);
      tokenBalance = insertResult.rows[0];
    }

    // Get subscription (read-only, no lock needed)
    const subscriptionResult = await client.query(`
      SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1
    `, [userId]);
    const subscription = subscriptionResult.rows[0] || null;

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await client.query(`
      SELECT COALESCE(SUM(usage_count), 0) as count FROM feature_usage
      WHERE user_id = $1 AND feature_type = $2 AND usage_date = $3
    `, [userId, FEATURE_TYPES.BARCODE_SCAN, today]);

    // Get monthly usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthStart = startOfMonth.toISOString().split('T')[0];

    const monthlyMealPlanResult = await client.query(`
      SELECT COALESCE(SUM(usage_count), 0) as count FROM feature_usage
      WHERE user_id = $1 AND feature_type = $2 AND usage_date >= $3
    `, [userId, FEATURE_TYPES.AI_MEAL_PLAN, monthStart]);

    const monthlyRecipeResult = await client.query(`
      SELECT COALESCE(SUM(usage_count), 0) as count FROM feature_usage
      WHERE user_id = $1 AND feature_type = $2 AND usage_date >= $3
    `, [userId, FEATURE_TYPES.AI_RECIPE, monthStart]);

    const tier = this.determineTier(subscription);
    const limits = TIER_LIMITS[tier];

    return {
      tier,
      isTrialing: subscription?.status === 'trialing',
      trialDaysRemaining: this.calculateTrialDays(subscription),
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancelled_at !== null && subscription?.status === 'active',
      ...limits,
      aiMealPlansUsed: Number(monthlyMealPlanResult.rows[0]?.count ?? 0) + (tokenBalance?.ai_tokens_monthly_used ?? 0),
      aiRecipeSuggestionsUsed: Number(monthlyRecipeResult.rows[0]?.count ?? 0),
      barcodeScansToday: Number(todayResult.rows[0]?.count ?? 0),
      pdfExportsUsed: tokenBalance?.exports_monthly_used ?? 0,
      aiTokens: tokenBalance?.ai_tokens ?? 0,
      exportTokens: tokenBalance?.export_tokens ?? 0,
      streakShields: tokenBalance?.streak_shields ?? 0,
    };
  }

  /**
   * Atomically deduct tokens with row-level locking
   */
  private async deductTokensAtomic(
    userId: string,
    tokenType: 'ai_tokens' | 'export_tokens' | 'streak_shields',
    amount: number,
    client: any
  ): Promise<{ success: boolean; newBalance: number }> {
    const columnName = {
      ai_tokens: 'ai_tokens',
      export_tokens: 'export_tokens',
      streak_shields: 'streak_shields',
    }[tokenType];

    // Atomic update: only succeeds if sufficient balance exists
    const result = await client.query(`
      UPDATE token_balances
      SET ${columnName} = ${columnName} - $1, updated_at = NOW()
      WHERE user_id = $2 AND ${columnName} >= $1
      RETURNING ${columnName} as new_balance
    `, [amount, userId]);

    if (result.rows.length === 0) {
      return { success: false, newBalance: 0 };
    }

    const newBalance = result.rows[0].new_balance;

    // Record transaction
    await client.query(`
      INSERT INTO token_transactions (user_id, token_type, amount, balance_after, source, description)
      VALUES ($1, $2, $3, $4, 'usage', $5)
    `, [userId, tokenType, -amount, newBalance, `Used ${amount} ${tokenType.replace('_', ' ')}`]);

    return { success: true, newBalance };
  }

  /**
   * Use a streak shield atomically to prevent race conditions
   */
  async useStreakShield(userId: string): Promise<{ success: boolean; remaining: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock and get balance
      const balanceResult = await client.query(`
        SELECT * FROM token_balances WHERE user_id = $1 FOR UPDATE
      `, [userId]);

      let balance = balanceResult.rows[0];
      if (!balance) {
        const insertResult = await client.query(`
          INSERT INTO token_balances (user_id) VALUES ($1) RETURNING *
        `, [userId]);
        balance = insertResult.rows[0];
      }

      // Get subscription to determine tier
      const subscriptionResult = await client.query(`
        SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1
      `, [userId]);
      const subscription = subscriptionResult.rows[0] || null;
      const tier = this.determineTier(subscription);
      const limits = TIER_LIMITS[tier];

      // Check for Pro monthly shields first
      if (tier === 'pro') {
        const monthlyUsed = balance.streak_shields_monthly_used || 0;
        if (monthlyUsed < limits.monthlyStreakShields) {
          await client.query(`
            UPDATE token_balances
            SET streak_shields_monthly_used = streak_shields_monthly_used + 1, updated_at = NOW()
            WHERE user_id = $1
          `, [userId]);

          await client.query('COMMIT');
          return {
            success: true,
            remaining: limits.monthlyStreakShields - monthlyUsed - 1 + (balance.streak_shields || 0),
          };
        }
      }

      // Try to use purchased shields atomically
      const updateResult = await client.query(`
        UPDATE token_balances
        SET streak_shields = streak_shields - 1, updated_at = NOW()
        WHERE user_id = $1 AND streak_shields >= 1
        RETURNING streak_shields as new_balance
      `, [userId]);

      if (updateResult.rows.length > 0) {
        // Record transaction
        await client.query(`
          INSERT INTO token_transactions (user_id, token_type, amount, balance_after, source, description)
          VALUES ($1, 'streak_shields', -1, $2, 'usage', 'Used 1 streak shield')
        `, [userId, updateResult.rows[0].new_balance]);

        await client.query('COMMIT');
        return {
          success: true,
          remaining: updateResult.rows[0].new_balance,
        };
      }

      await client.query('ROLLBACK');
      return { success: false, remaining: 0 };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add tokens to user's balance atomically (after purchase or reward)
   */
  async addTokens(
    userId: string,
    tokenType: 'ai_tokens' | 'export_tokens' | 'streak_shields',
    amount: number,
    source: 'purchase' | 'subscription' | 'reward',
    sourceReference?: string
  ): Promise<TokenBalance> {
    const columnName = {
      ai_tokens: 'ai_tokens',
      export_tokens: 'export_tokens',
      streak_shields: 'streak_shields',
    }[tokenType];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure balance exists, then atomically add tokens
      await client.query(`
        INSERT INTO token_balances (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);

      const result = await client.query(`
        UPDATE token_balances
        SET ${columnName} = ${columnName} + $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING *
      `, [amount, userId]);

      const newBalance = result.rows[0][columnName];

      // Record transaction
      await client.query(`
        INSERT INTO token_transactions (user_id, token_type, amount, balance_after, source, source_reference, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, tokenType, amount, newBalance, source, sourceReference, `Added ${amount} ${tokenType.replace('_', ' ')}`]);

      await client.query('COMMIT');

      // Return updated balance in camelCase format
      return {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        aiTokens: result.rows[0].ai_tokens,
        exportTokens: result.rows[0].export_tokens,
        streakShields: result.rows[0].streak_shields,
        aiTokensMonthlyUsed: result.rows[0].ai_tokens_monthly_used,
        exportsMonthlyUsed: result.rows[0].exports_monthly_used,
        streakShieldsMonthlyUsed: result.rows[0].streak_shields_monthly_used,
        monthlyResetDate: result.rows[0].monthly_reset_date,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

    // Validate expiration date - don't trust status alone
    const now = new Date();
    const currentPeriodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : null;

    // Active or trialing Pro subscription with valid period
    if (subscription.tier === 'pro' && ['active', 'trialing'].includes(subscription.status)) {
      // If currentPeriodEnd exists, ensure it hasn't expired
      if (currentPeriodEnd && currentPeriodEnd < now) {
        console.warn(`Subscription ${subscription.id} has expired period but active status - treating as free`);
        return 'free';
      }
      return 'pro';
    }

    // Past due but still within grace period (7 days after expiration)
    if (subscription.tier === 'pro' && subscription.status === 'past_due') {
      if (currentPeriodEnd) {
        const gracePeriodEnd = new Date(currentPeriodEnd);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7-day grace period

        if (now > gracePeriodEnd) {
          console.warn(`Subscription ${subscription.id} grace period expired - treating as free`);
          return 'free';
        }
      }
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
