import type { Express, RequestHandler } from 'express';
import session from 'express-session';
import { storage } from './storage';

// Temporary: Always use dev mode for now. Switch back to Auth0 by changing this to false.
const DEV_MODE = true; // process.env.USE_DEV_AUTH === 'true';

// Simple in-memory session store for development
export function setupDevAuth(app: Express) {
  if (!DEV_MODE) return;

  // Setup session middleware
  app.use(session({
    secret: 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  }));

  // Dev login endpoint
  app.post('/api/dev-login', async (req, res) => {
    try {
      const { email } = req.body;
      const userEmail = email || 'demo@semaslim.com';
      const userId = `dev-user-${Buffer.from(userEmail).toString('base64').substring(0, 20)}`;

      // Create or get user
      let user = await storage.getUser(userId);
      
      if (!user) {
        // Create new dev user
        await storage.upsertUser({
          id: userId,
          email: userEmail,
          firstName: 'Demo',
          lastName: 'User',
        });
        user = await storage.getUser(userId);
      }

      // Set session
      (req.session as any).userId = userId;
      (req.session as any).user = {
        sub: userId,
        email: userEmail,
        name: `${user?.firstName || 'Demo'} ${user?.lastName || 'User'}`,
        given_name: user?.firstName || 'Demo',
        family_name: user?.lastName || 'User',
      };

      res.json({ success: true, user });
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Dev logout endpoint
  app.get('/api/dev-logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });
}

// Middleware that works with both Auth0 and dev auth
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (DEV_MODE) {
    // Dev mode authentication
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Ensure user exists in database
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Mock req.oidc structure for compatibility
    req.oidc = {
      user: req.session.user,
      isAuthenticated: () => true,
    };

    return next();
  }

  // Auth0 mode (original implementation)
  if (!req.oidc?.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = req.oidc.user;
  
  // Sync user with database
  await storage.upsertUser({
    id: user.sub,
    email: user.email,
    firstName: user.given_name || user.name?.split(' ')[0],
    lastName: user.family_name || user.name?.split(' ')[1],
    profileImageUrl: user.picture,
  });

  next();
};

export { DEV_MODE };
