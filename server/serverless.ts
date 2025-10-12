// Serverless entry point - no vite/rollup dependencies
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { xss } from "express-xss-sanitizer";
import hpp from "hpp";
import cors from "cors";
import { registerRoutes } from "./routes";
import { logger } from "./logger";

// Create and export the app factory for serverless environments
export async function createServer() {
  const serverApp = express();

  // Trust proxy for rate limiting in Vercel environment
  serverApp.set('trust proxy', 1);

  // Apply all middleware
  serverApp.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.clerk.accounts.dev", "https://img.clerk.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.clerk.accounts.dev", "https://*.clerk.com"],
        scriptSrcElem: ["'self'", "'unsafe-inline'", "https://*.clerk.accounts.dev", "https://*.clerk.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        connectSrc: ["'self'", "wss:", "https:", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://clerk.com"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'", "https://*.clerk.accounts.dev", "https://*.clerk.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  serverApp.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (process.env.NODE_ENV === 'development' ||
          allowedOrigins.includes(origin) ||
          origin.includes('localhost') ||
          origin.endsWith('.replit.app') ||
          origin.endsWith('.replit.dev') ||
          origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  serverApp.use('/api/', apiLimiter);
  serverApp.use(mongoSanitize({ replaceWith: '_' }));
  serverApp.use(xss());
  serverApp.use(hpp());
  serverApp.use(express.json());
  serverApp.use(express.urlencoded({ extended: false }));

  // Handle favicon
  serverApp.get('/favicon.ico', (_req, res) => {
    res.redirect(301, '/icons/icon-192.svg');
  });

  // Register routes
  await registerRoutes(serverApp);

  // In serverless, static files are served by Vercel CDN
  // No need to set up static file serving here

  // Error handler
  serverApp.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger.error("Request error", err, {
      method: req.method,
      path: req.path,
      status,
    });
    res.status(status).json({ message });
  });

  return serverApp;
}
