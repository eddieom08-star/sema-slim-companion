import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { xss } from "express-xss-sanitizer";
import hpp from "hpp";
import cors from "cors";
import { registerRoutes } from "./routes";
import { logger } from "./logger";

// Lazy import vite module to avoid bundling rollup in production
async function getViteModule() {
  const viteModule = await import("./vite");
  return viteModule;
}

// Create and export the app factory for serverless environments
export async function createServer() {
  const serverApp = express();

  // Trust proxy for rate limiting in Replit/Vercel environment
  serverApp.set('trust proxy', 1);

  // Apply all middleware (same as main app)
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

      // Allow localhost, Replit, Vercel domains, and Capacitor native apps
      if (process.env.NODE_ENV === 'development' ||
          allowedOrigins.includes(origin) ||
          origin.includes('localhost') ||
          origin.startsWith('capacitor://') ||
          origin.startsWith('ionic://') ||
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
  serverApp.use(express.json({ limit: '10mb' })); // Allow larger payloads for image uploads
  serverApp.use(express.urlencoded({ extended: false }));

  // Handle favicon
  serverApp.get('/favicon.ico', (_req, res) => {
    res.redirect(301, '/icons/icon-192.svg');
  });

  // Register routes
  await registerRoutes(serverApp);

  // In serverless environments, static files are served by the platform (Vercel CDN, etc.)
  // We don't need to serve them from the Express app
  // Skip loading vite module entirely to avoid bundling rollup
  if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const { serveStatic } = await getViteModule();
    serveStatic(serverApp);
  }

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

const app = express();

// Trust proxy for rate limiting in Replit/Vercel environment
app.set('trust proxy', 1);

// Security Headers - Helmet  
app.use(helmet({
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

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (same-origin requests, including Vite dev server)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Allow localhost, Replit, Vercel domains, and Capacitor native apps
    if (process.env.NODE_ENV === 'development' ||
        allowedOrigins.includes(origin) ||
        origin.includes('localhost') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('ionic://') ||
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

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);
app.use('/login', authLimiter);
app.use('/callback', authLimiter);

// Data Sanitization against NoSQL Injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('Sanitized NoSQL injection attempt', { 
      ip: req.ip, 
      key,
      path: req.path 
    });
  },
}));

// Data Sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb', // Allow larger payloads for image uploads (base64 encoded)
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      // Use console.log directly instead of log from vite module
      console.log(logLine);
    }
  });

  next();
});

// Only start the server if not in serverless mode (Vercel/Lambda)
if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  (async () => {
    try {
      logger.info('Starting server initialization', {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || '5000',
        hasDatabase: !!process.env.DATABASE_URL,
        hasClerkKeys: !!(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
      });

      // Handle favicon requests to prevent 502 errors
      app.get('/favicon.ico', (_req, res) => {
        res.redirect(301, '/icons/icon-192.svg');
      });

      logger.info('Registering routes...');
      const server = await registerRoutes(app);
      logger.info('Routes registered successfully');

      app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        logger.error("Request error", err, {
          method: req.method,
          path: req.path,
          status,
          userId: (req as any).oidc?.user?.sub,
        });

        res.status(status).json({ message });
      });

      // Lazy load vite module only when needed
      const { setupVite, serveStatic } = await getViteModule();

      // importantly only setup vite in development and after
      // setting up all the other routes so the catch-all route
      // doesn't interfere with the other routes
      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      // ALWAYS serve the app on the port specified in the environment variable PORT
      // Other ports are firewalled. Default to 5000 if not specified.
      // this serves both the API and the client.
      // It is the only port that is not firewalled.
      const port = parseInt(process.env.PORT || '5000', 10);
      logger.info('Starting HTTP server...', { port, host: '0.0.0.0' });

      server.listen(port, "0.0.0.0", () => {
        logger.info(`Server started successfully on port ${port}`);
        console.log(`serving on port ${port}`);
      });

      // Handle server listen errors
      server.on('error', (error: any) => {
        logger.error('Server listen error', error, {
          port,
          code: error.code,
          syscall: error.syscall
        });
        process.exit(1);
      });

  // Graceful shutdown handler
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close database connection pool
        const { pool } = await import('./db');
        await pool.end();
        logger.info('Database pool closed');
      } catch (error) {
        logger.error('Error closing database pool', error as Error);
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors without crashing
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception - this should not happen!', error);
    // Log but don't exit - let the process manager handle restarts if needed
  });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection', reason as Error, { promise: String(promise) });
        // Log but don't exit - let the process manager handle restarts if needed
      });

    } catch (error) {
      logger.error('Fatal error during server initialization', error as Error);
      process.exit(1);
    }
  })();
} else {
  logger.info('Running in serverless mode - skipping server.listen()', {
    isVercel: process.env.VERCEL === '1',
    isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  });
}
