import { Request, Response, NextFunction } from 'express';
import { entitlementsService } from '../services/entitlements';
import { sendFeatureLimitError, sendUnauthorizedError } from '../lib/error-responses';
import type { FeatureType } from '../../shared/features';

/**
 * Middleware factory for feature gating
 * Checks if user has access to a feature before allowing the request to proceed
 *
 * Usage:
 * app.post('/api/ai/recipe', requireFeature('ai_recipe'), async (req, res) => { ... });
 */
export function requireFeature(
  feature: FeatureType,
  options: {
    quantity?: number;
    consumeOnSuccess?: boolean;
    useTokens?: boolean;
  } = {}
) {
  const { quantity = 1, consumeOnSuccess = false, useTokens = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return sendUnauthorizedError(res);
      }

      const canUse = await entitlementsService.canUseFeature(userId, feature, quantity);

      if (!canUse.allowed) {
        return sendFeatureLimitError(
          res,
          canUse.reason || 'feature_limit_reached',
          canUse.upsellType || 'pro',
          canUse.remaining || 0
        );
      }

      // Attach entitlement info to request for use in route handler
      (req as any).featureAccess = {
        feature,
        quantity,
        remaining: canUse.remaining,
        useTokens,
      };

      // Optionally consume the feature immediately (for simpler routes)
      if (consumeOnSuccess) {
        const consumeResult = await entitlementsService.consumeFeature(
          userId,
          feature,
          quantity,
          useTokens
        );

        if (!consumeResult.success) {
          return sendFeatureLimitError(
            res,
            'feature_consumption_failed',
            'pro',
            0
          );
        }

        (req as any).featureConsumption = consumeResult;
      }

      next();
    } catch (error) {
      console.error('Feature gate middleware error:', error);
      res.status(500).json({ error: 'Feature check failed' });
    }
  };
}

/**
 * Middleware to require Pro subscription
 *
 * Usage:
 * app.get('/api/pro-feature', requirePro(), async (req, res) => { ... });
 */
export function requirePro() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return sendUnauthorizedError(res);
      }

      const entitlements = await entitlementsService.getUserEntitlements(userId);

      if (entitlements.tier !== 'pro') {
        return res.status(402).json({
          error: {
            code: 'subscription_required',
            message: 'This feature requires a Pro subscription',
            upsell: {
              type: 'pro',
              reason: 'tier_restricted',
            },
          },
        });
      }

      // Attach entitlements to request
      (req as any).entitlements = entitlements;

      next();
    } catch (error) {
      console.error('Pro gate middleware error:', error);
      res.status(500).json({ error: 'Subscription check failed' });
    }
  };
}

/**
 * Middleware to attach entitlements to request (without blocking)
 * Useful for routes that need entitlement info but don't require specific features
 *
 * Usage:
 * app.get('/api/dashboard', withEntitlements(), async (req, res) => {
 *   const entitlements = req.entitlements;
 *   // ...
 * });
 */
export function withEntitlements() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).auth?.userId;
      if (userId) {
        const entitlements = await entitlementsService.getUserEntitlements(userId);
        (req as any).entitlements = entitlements;
      }
      next();
    } catch (error) {
      // Non-blocking - just log and continue
      console.error('Failed to fetch entitlements:', error);
      next();
    }
  };
}
