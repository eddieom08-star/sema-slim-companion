import { auth, requiresAuth } from 'express-openid-connect';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';

if (!process.env.AUTH0_DOMAIN) {
  throw new Error('AUTH0_DOMAIN environment variable is required');
}

if (!process.env.AUTH0_CLIENT_ID) {
  throw new Error('AUTH0_CLIENT_ID environment variable is required');
}

if (!process.env.AUTH0_CLIENT_SECRET) {
  throw new Error('AUTH0_CLIENT_SECRET environment variable is required');
}

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required for secure session management');
}

const baseURL = process.env.REPLIT_DOMAINS 
  ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
  : 'http://localhost:5000';

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SESSION_SECRET,
  baseURL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email',
  },
};

export function setupAuth0(app: Express) {
  app.use(auth(config));
  
  // Custom sign-up route with screen_hint=signup to show registration form
  app.get('/signup', (req, res) => {
    res.oidc.login({
      authorizationParams: {
        screen_hint: 'signup',
      },
      returnTo: '/',
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.oidc.isAuthenticated()) {
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
