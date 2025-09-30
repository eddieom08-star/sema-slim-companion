import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { extractTokenFromHeader, verifyAccessToken } from './auth';

export const isAuthenticated: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Unauthorized - Invalid or expired token' });
  }

  // Store JWT payload in user object
  (req as any).user = payload;
  next();
};
