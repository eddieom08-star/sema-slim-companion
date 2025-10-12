import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';
import { storage } from './storage';

export { clerkMiddleware };

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await clerkClient.users.getUser(auth.userId);

    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error('Clerk user has no email address:', auth.userId);
      return res.status(401).json({ message: 'Email address required' });
    }

    // Upsert user with Clerk data - DB will use default for onboardingCompleted if not present
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

    next();
  } catch (error) {
    console.error('Clerk authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
