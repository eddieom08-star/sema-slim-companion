import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';
import { storage } from './storage';
import { logger } from './logger';

export { clerkMiddleware };

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  const auth = getAuth(req);

  // Enhanced logging for debugging auth issues
  const authHeader = req.headers.authorization;
  logger.info('Auth request received', {
    path: req.path,
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 20),
    authHeaderLength: authHeader?.length,
    authObject: {
      hasUserId: !!auth.userId,
      hasSessionId: !!auth.sessionId,
      userId: auth.userId || 'null',
      sessionId: auth.sessionId || 'null',
    },
    allHeaders: Object.keys(req.headers),
  });

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

    // Upsert user with Clerk data - DB will use default for onboardingCompleted if not present
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
      user: dbUser,  // Return DB user with full profile including onboardingCompleted
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
