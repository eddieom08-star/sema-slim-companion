import { clerkClient, clerkMiddleware, getAuth, verifyToken } from '@clerk/express';
import type { RequestHandler } from 'express';
import { storage } from './storage';
import { logger } from './logger';

export { clerkMiddleware };

/**
 * Extract and verify Bearer token from Authorization header
 * Used as fallback when clerkMiddleware doesn't set auth (e.g., mobile apps)
 */
async function verifyBearerToken(authHeader: string | undefined): Promise<{ userId: string; sessionId?: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      logger.error('CLERK_SECRET_KEY not configured');
      return null;
    }

    // Verify the JWT token using Clerk's verifyToken
    const payload = await verifyToken(token, {
      secretKey,
    });

    if (payload.sub) {
      logger.info('Bearer token verified successfully', {
        userId: payload.sub,
        sessionId: payload.sid,
      });
      return {
        userId: payload.sub,
        sessionId: payload.sid as string | undefined
      };
    }

    return null;
  } catch (error) {
    logger.warn('Bearer token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenLength: token.length,
    });
    return null;
  }
}

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;

  // First try getAuth (works for session-based auth from web)
  let auth = getAuth(req);

  // Log initial auth state
  logger.info('Auth request received', {
    path: req.path,
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 30),
    authHeaderLength: authHeader?.length,
    initialAuthObject: {
      hasUserId: !!auth.userId,
      userId: auth.userId || 'null',
    },
  });

  // If no userId from middleware, try to verify Bearer token directly (for mobile)
  if (!auth.userId && authHeader) {
    logger.info('No userId from middleware, attempting Bearer token verification');
    const bearerAuth = await verifyBearerToken(authHeader);
    if (bearerAuth) {
      auth = {
        ...auth,
        userId: bearerAuth.userId,
        sessionId: bearerAuth.sessionId || null
      } as any;
      logger.info('Bearer token auth successful', { userId: bearerAuth.userId });
    }
  }

  if (!auth.userId) {
    logger.warn('Auth check failed: no userId', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      method: req.method,
    });
    return res.status(401).json({
      message: 'Unauthorized',
      details: 'No valid session found. Please sign in again.'
    });
  }

  try {
    logger.info('Fetching Clerk user data', { userId: auth.userId });
    const user = await clerkClient.users.getUser(auth.userId);

    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress;

    if (!email) {
      logger.error('Clerk user has no email address', {
        userId: auth.userId,
        emailAddressesCount: user.emailAddresses.length
      });
      return res.status(401).json({ message: 'Email address required' });
    }

    // Upsert user with Clerk data
    logger.info('Upserting user to database', { userId: auth.userId, email });
    const dbUser = await storage.upsertUser({
      id: auth.userId,
      email: email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      profileImageUrl: user.imageUrl,
    });

    req.auth = {
      userId: auth.userId,
      sessionId: auth.sessionId,
      user: dbUser,
    };

    logger.info('Auth successful', {
      userId: auth.userId,
      email,
      onboardingCompleted: dbUser.onboardingCompleted
    });
    next();
  } catch (error) {
    logger.error('Clerk authentication error', error as Error, {
      userId: auth.userId,
      path: req.path,
    });
    return res.status(401).json({
      message: 'Unauthorized',
      details: 'Failed to verify authentication. Please try signing in again.'
    });
  }
};
