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
    
    await storage.upsertUser({
      id: auth.userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      profileImageUrl: user.imageUrl,
    });

    req.auth = {
      userId: auth.userId,
      sessionId: auth.sessionId,
      user: user,
    };

    next();
  } catch (error) {
    console.error('Clerk authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
