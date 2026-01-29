import type { Response } from 'express';

/**
 * Standard API error response envelope
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    upsell?: {
      type: string;
      reason: string;
      remaining?: number;
    };
  };
}

/**
 * Standard error codes for monetization
 */
export const ErrorCodes = {
  // Authentication (401)
  UNAUTHORIZED: 'unauthorized',
  SESSION_EXPIRED: 'session_expired',

  // Payment Required (402)
  FEATURE_LIMIT_REACHED: 'feature_limit_reached',
  SUBSCRIPTION_REQUIRED: 'subscription_required',
  TOKENS_REQUIRED: 'tokens_required',
  PAYMENT_FAILED: 'payment_failed',

  // Forbidden (403)
  ACCESS_DENIED: 'access_denied',
  TIER_RESTRICTED: 'tier_restricted',

  // Not Found (404)
  NOT_FOUND: 'not_found',

  // Validation (400)
  VALIDATION_ERROR: 'validation_error',
  INVALID_REQUEST: 'invalid_request',

  // Server Error (500)
  INTERNAL_ERROR: 'internal_error',
} as const;

/**
 * Feature limit error messages by type
 */
const FEATURE_LIMIT_MESSAGES: Record<string, string> = {
  ai_meal_plan_limit_reached: 'You have reached your monthly meal plan limit. Upgrade to Pro or purchase tokens.',
  ai_recipe_limit_reached: 'You have reached your monthly recipe generation limit. Upgrade to Pro or purchase tokens.',
  barcode_scan_limit_reached: 'You have reached your daily barcode scan limit. Upgrade to Pro for unlimited scans.',
  no_export_tokens: 'You need export tokens to export PDFs. Purchase tokens or upgrade to Pro.',
  no_streak_shields: 'No streak shields available. Purchase more shields to protect your streak.',
};

/**
 * Send standardized feature limit error (402 Payment Required)
 */
export function sendFeatureLimitError(
  res: Response,
  reason: string,
  upsellType: string,
  remaining: number = 0
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.FEATURE_LIMIT_REACHED,
      message: FEATURE_LIMIT_MESSAGES[reason] || 'Feature limit reached',
      upsell: {
        type: upsellType,
        reason,
        remaining,
      },
    },
  };

  res.status(402).json(response);
}

/**
 * Send standardized subscription required error (402)
 */
export function sendSubscriptionRequiredError(
  res: Response,
  feature: string
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.SUBSCRIPTION_REQUIRED,
      message: `A subscription is required to access ${feature}`,
      upsell: {
        type: 'pro',
        reason: 'subscription_required',
      },
    },
  };

  res.status(402).json(response);
}

/**
 * Send standardized unauthorized error (401)
 */
export function sendUnauthorizedError(
  res: Response,
  message: string = 'Authentication required'
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.UNAUTHORIZED,
      message,
    },
  };

  res.status(401).json(response);
}

/**
 * Send standardized forbidden error (403)
 */
export function sendForbiddenError(
  res: Response,
  message: string = 'Access denied'
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.ACCESS_DENIED,
      message,
    },
  };

  res.status(403).json(response);
}

/**
 * Send standardized validation error (400)
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: Record<string, unknown>
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      details,
    },
  };

  res.status(400).json(response);
}

/**
 * Send standardized not found error (404)
 */
export function sendNotFoundError(
  res: Response,
  resource: string = 'Resource'
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `${resource} not found`,
    },
  };

  res.status(404).json(response);
}

/**
 * Send standardized internal error (500)
 */
export function sendInternalError(
  res: Response,
  message: string = 'An unexpected error occurred'
): void {
  const response: ApiErrorResponse = {
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message,
    },
  };

  res.status(500).json(response);
}
