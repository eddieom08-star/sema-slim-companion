import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "./logger";
import { clerkMiddleware, requireAuth } from "./clerkAuth";
import { Anthropic } from "@anthropic-ai/sdk";

const isAuthenticated = requireAuth;
import {
  insertMedicationSchema,
  insertMedicationLogSchema,
  insertFoodEntrySchema,
  insertWeightLogSchema,
  insertBodyMeasurementSchema,
  updateUserProfileSchema,
  insertDoseEscalationSchema,
  insertHungerLogSchema,
  insertFoodDatabaseSchema,
  insertRecipeSchema,
  insertMealPlanSchema,
  insertMealPlanEntrySchema,
  insertMealPrepScheduleSchema,
  insertNutritionalRecommendationSchema
} from "@shared/schema";

// Fetch with timeout wrapper to prevent hanging requests
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Verify Clerk credentials are loaded
  if (!process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    const envDebug = {
      hasPublishable: !!process.env.CLERK_PUBLISHABLE_KEY,
      hasSecret: !!process.env.CLERK_SECRET_KEY,
      hasViteClerkKey: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
      isVercel: process.env.VERCEL === '1',
      nodeEnv: process.env.NODE_ENV,
      // Log all env var keys (not values) for debugging
      envKeys: Object.keys(process.env).filter(k => k.includes('CLERK')).join(', ')
    };

    logger.error('Clerk credentials not found in environment', envDebug);
    console.error('CRITICAL: Clerk environment variables missing:', JSON.stringify(envDebug, null, 2));

    throw new Error(`CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must be set. Debug: ${JSON.stringify(envDebug)}`);
  }

  logger.info('Initializing Clerk middleware', {
    publishableKeyPrefix: process.env.CLERK_PUBLISHABLE_KEY.substring(0, 15),
  });

  // Apply Clerk middleware to all routes with explicit config
  app.use(clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }));

  // Health check endpoints (no auth required)
  app.get('/health', async (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', async (_req, res) => {
    try {
      // Check database connection with retry
      const { pool, withRetry } = await import('./db');
      await withRetry(() => pool.query('SELECT 1'), 2, 500);
      
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', error as Error);
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/api/readiness', async (_req, res) => {
    try {
      const { pool, withRetry } = await import('./db');
      await withRetry(() => pool.query('SELECT 1'), 2, 500);
      res.status(200).json({ ready: true });
    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      res.status(503).json({ ready: false });
    }
  });

  // Diagnostic endpoint for environment variables (no auth required)
  app.get('/api/diagnostics', async (_req, res) => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV || 'not set',
          isVercel: process.env.VERCEL === '1',
          isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
        },
        envVars: {
          hasClerkPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
          hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
          hasViteClerkPublishableKey: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasAnthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
          hasSessionSecret: !!process.env.SESSION_SECRET,
          clerkPublishableKeyPrefix: process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 15) || 'not set',
        },
        database: 'checking...'
      };

      // Test database connection
      try {
        const { pool, withRetry } = await import('./db');
        await withRetry(() => pool.query('SELECT 1'), 2, 500);
        diagnostics.database = 'connected';
      } catch (dbError) {
        diagnostics.database = `error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
      }

      const allEnvVarsSet =
        diagnostics.envVars.hasClerkPublishableKey &&
        diagnostics.envVars.hasClerkSecretKey &&
        diagnostics.envVars.hasDatabaseUrl;

      res.status(allEnvVarsSet ? 200 : 503).json({
        status: allEnvVarsSet && diagnostics.database === 'connected' ? 'healthy' : 'configuration_error',
        message: allEnvVarsSet
          ? 'All critical environment variables are set'
          : 'Missing required environment variables - check Vercel dashboard',
        diagnostics
      });
    } catch (error) {
      logger.error('Diagnostics check failed', error as Error);
      res.status(500).json({
        status: 'error',
        message: 'Diagnostics check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Auth routes

  // Login endpoint - redirects to Clerk sign-in
  app.get('/api/login', (_req, res) => {
    // In production, Clerk handles this client-side
    // This endpoint is for API documentation/testing
    res.status(200).json({
      message: 'Please use Clerk sign-in component on the frontend',
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 15) + '...'
    });
  });

  // Logout endpoint - clears Clerk session
  app.post('/api/logout', async (req: any, res) => {
    try {
      logger.info('User logout requested', { userId: req.auth?.userId });

      // Clerk handles session management via cookies
      // Clear the session cookie and respond
      res.clearCookie('__session', { path: '/' });
      res.clearCookie('__clerk_db_jwt', { path: '/' });

      res.status(200).json({
        message: 'Logged out successfully',
        redirect: '/'
      });
    } catch (error) {
      logger.error('Logout error', error as Error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // Also support GET for logout (for browser redirects)
  app.get('/api/logout', async (req: any, res) => {
    try {
      logger.info('User logout requested (GET)', { userId: req.auth?.userId });

      res.clearCookie('__session', { path: '/' });
      res.clearCookie('__clerk_db_jwt', { path: '/' });

      // Redirect to home page after logout
      res.redirect('/');
    } catch (error) {
      logger.error('Logout error', error as Error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      logger.info('Fetching user from database', { userId });

      const user = await storage.getUser(userId);
      if (!user) {
        logger.warn('User not found in database after auth', { userId });
        return res.status(404).json({
          message: "User not found",
          details: "User authenticated but not found in database"
        });
      }

      logger.info('User fetched successfully', {
        userId,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted
      });
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user from database", error as Error, {
        userId: req.auth?.userId,
        path: req.path
      });
      res.status(500).json({
        message: "Failed to fetch user",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Logout route - redirects to Clerk sign-out with proper return URL
  app.get('/api/logout', (_req, res) => {
    // Clerk handles session cleanup via their sign-out endpoint
    // All data is automatically saved since it's persisted in the database on each request
    const signOutUrl = process.env.CLERK_SIGN_OUT_URL || 'https://clerk.complete-bullfrog-71.accounts.dev/sign-out';
    const returnUrl = process.env.NODE_ENV === 'production'
      ? process.env.PRODUCTION_URL || 'http://localhost:3000'
      : 'http://localhost:3000';

    res.redirect(`${signOutUrl}?redirect_url=${encodeURIComponent(returnUrl)}`);
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      console.log("Updating profile for user:", userId, "with data:", req.body);
      const validatedData = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(userId, validatedData);

      // If onboarding is being completed and medication data is provided, create a medication entry
      if (validatedData.onboardingCompleted && validatedData.medicationType && validatedData.startDate) {
        // Check if medication already exists to avoid duplicates
        const existingMedications = await storage.getUserMedications(userId);

        if (existingMedications.length === 0) {
          // Determine default dosage based on medication type
          const defaultDosages: Record<string, string> = {
            'ozempic': '0.25mg',
            'mounjaro': '2.5mg',
            'wegovy': '0.25mg',
            'rybelsus': '3mg'
          };

          const dosage = defaultDosages[validatedData.medicationType] || '0.25mg';

          // Calculate next due date (weekly for most GLP-1s)
          const nextDueDate = new Date(validatedData.startDate);
          nextDueDate.setDate(nextDueDate.getDate() + 7);

          await storage.createMedication({
            userId,
            medicationType: validatedData.medicationType,
            dosage,
            frequency: 'weekly',
            startDate: validatedData.startDate,
            nextDueDate,
            reminderEnabled: true,
            adherenceScore: 100
          });

          console.log(`Created medication entry for user ${userId}: ${validatedData.medicationType} ${dosage}`);
        }
      }

      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.issues);
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Dashboard data
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const dashboardData = await storage.getDashboardData(userId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Medication routes
  app.get('/api/medications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const medications = await storage.getUserMedications(userId);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ message: "Failed to fetch medications" });
    }
  });

  app.post('/api/medications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertMedicationSchema.parse({ ...req.body, userId });
      const medication = await storage.createMedication(validatedData);
      res.json(medication);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.issues);
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating medication:", error);
      res.status(500).json({ message: "Failed to create medication" });
    }
  });

  app.put('/api/medications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const medication = await storage.updateMedication(id, req.body);
      res.json(medication);
    } catch (error) {
      console.error("Error updating medication:", error);
      res.status(500).json({ message: "Failed to update medication" });
    }
  });

  app.delete('/api/medications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMedication(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting medication:", error);
      res.status(500).json({ message: "Failed to delete medication" });
    }
  });

  // Medication log routes
  app.get('/api/medication-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getUserMedicationLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching medication logs:", error);
      res.status(500).json({ message: "Failed to fetch medication logs" });
    }
  });

  app.post('/api/medication-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertMedicationLogSchema.parse({ ...req.body, userId });
      const log = await storage.createMedicationLog(validatedData);
      
      // Award points for taking medication
      await storage.addPoints(userId, 5, 'medication_taken', 'Logged medication');
      
      res.json(log);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.issues);
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating medication log:", error);
      res.status(500).json({ message: "Failed to create medication log" });
    }
  });

  // Food entry routes
  app.get('/api/food-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const entries = await storage.getUserFoodEntries(userId, date);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching food entries:", error);
      res.status(500).json({ message: "Failed to fetch food entries" });
    }
  });

  // Alias for food-logs (used by charts)
  app.get('/api/food-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      // Get all food entries (no date filter for historical charting)
      const entries = await storage.getUserFoodEntries(userId, undefined);

      // Apply limit if specified
      const limitedEntries = limit ? entries.slice(0, limit) : entries;

      res.json(limitedEntries);
    } catch (error) {
      console.error("Error fetching food logs:", error);
      res.status(500).json({ message: "Failed to fetch food logs" });
    }
  });

  app.post('/api/food-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertFoodEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createFoodEntry(validatedData);
      
      // Update food tracking streak
      await storage.updateStreak(userId, 'food_tracking', true);
      
      // Award points for logging food
      await storage.addPoints(userId, 3, 'food_logged', 'Logged food entry');
      
      res.json(entry);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.issues);
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating food entry:", error);
      res.status(500).json({ message: "Failed to create food entry" });
    }
  });

  app.put('/api/food-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.updateFoodEntry(id, req.body);
      res.json(entry);
    } catch (error) {
      console.error("Error updating food entry:", error);
      res.status(500).json({ message: "Failed to update food entry" });
    }
  });

  app.delete('/api/food-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFoodEntry(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting food entry:", error);
      res.status(500).json({ message: "Failed to delete food entry" });
    }
  });

  // Food database routes - Open Food Facts integration
  app.get('/api/food-database/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q, limit = 20 } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const searchLimit = parseInt(limit as string);

      // First, search our local database
      const localFoods = await storage.searchFoodByName(q, searchLimit);
      
      // Transform local foods to match response format
      const localResults = localFoods.map((food) => ({
        id: food.id,
        barcode: food.barcode,
        name: food.productName,
        brand: food.brand,
        servingSize: parseFloat(food.servingSize),
        servingUnit: food.servingUnit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        sodium: food.sodium,
        imageUrl: null,
        source: 'local',
      }));

      // If we have enough local results, return them first
      if (localResults.length >= 5) {
        return res.json(localResults.slice(0, searchLimit));
      }

      // Otherwise, supplement with Open Food Facts API
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${searchLimit - localResults.length}`;
      
      const response = await fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent': 'SemaSlim/1.0 (Weight Management App)'
        }
      }, 8000); // 8 second timeout for search

      if (!response.ok) {
        // If API fails, just return local results
        return res.json(localResults);
      }

      const data = await response.json();
      
      // Transform Open Food Facts data to our format
      const remoteProducts = data.products?.map((product: any) => ({
        id: product.code,
        barcode: product.code,
        name: product.product_name || product.product_name_en || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: product.image_url || product.image_small_url || null,
        servingSize: product.serving_quantity || 100,
        servingUnit: product.serving_quantity_unit || 'g',
        calories: Math.round(product.nutriments?.['energy-kcal_100g'] || 0),
        protein: product.nutriments?.proteins_100g || 0,
        carbs: product.nutriments?.carbohydrates_100g || 0,
        fat: product.nutriments?.fat_100g || 0,
        fiber: product.nutriments?.fiber_100g || 0,
        sugar: product.nutriments?.sugars_100g || 0,
        sodium: product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 1000 : 0, // Convert g to mg
        source: 'openfoodfacts'
      })) || [];

      // Merge local and remote results, prioritizing local foods
      // Deduplicate by barcode if present
      const seen = new Set(localResults.map(f => f.barcode).filter(Boolean));
      const uniqueRemoteProducts = remoteProducts.filter((food: any) => !food.barcode || !seen.has(food.barcode));
      
      const mergedResults = [...localResults, ...uniqueRemoteProducts].slice(0, searchLimit);

      res.json(mergedResults);
    } catch (error) {
      console.error("Error searching food database:", error);
      res.status(500).json({ message: "Failed to search food database" });
    }
  });

  app.get('/api/food-database/barcode/:barcode', isAuthenticated, async (req: any, res) => {
    try {
      const { barcode } = req.params;

      // First, try to find in our local database
      const localFood = await storage.searchFoodByBarcode(barcode);
      if (localFood) {
        return res.json({
          id: localFood.id,
          barcode: localFood.barcode,
          name: localFood.productName,
          brand: localFood.brand,
          imageUrl: null,
          servingSize: Number(localFood.servingSize),
          servingUnit: localFood.servingUnit,
          calories: localFood.calories,
          protein: Number(localFood.protein),
          carbs: Number(localFood.carbs),
          fat: Number(localFood.fat),
          fiber: Number(localFood.fiber),
          sugar: Number(localFood.sugar),
          sodium: Number(localFood.sodium),
          source: 'local'
        });
      }

      // If not found locally, search Open Food Facts
      const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
      
      const response = await fetchWithTimeout(offUrl, {
        headers: {
          'User-Agent': 'SemaSlim/1.0 (Weight Management App)'
        }
      }, 8000); // 8 second timeout for barcode lookup

      if (!response.ok) {
        return res.status(404).json({ message: "Product not found" });
      }

      const data = await response.json();
      
      if (data.status === 0 || !data.product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = data.product;
      
      // Save to local database for future lookups
      try {
        await storage.addFoodToDatabase({
          barcode: product.code,
          productName: product.product_name || product.product_name_en || 'Unknown Product',
          brand: product.brands || null,
          servingSize: product.serving_quantity || "100",
          servingUnit: product.serving_quantity_unit || 'g',
          calories: Math.round(product.nutriments?.['energy-kcal_100g'] || 0),
          protein: product.nutriments?.proteins_100g?.toString() || "0",
          carbs: product.nutriments?.carbohydrates_100g?.toString() || "0",
          fat: product.nutriments?.fat_100g?.toString() || "0",
          fiber: product.nutriments?.fiber_100g?.toString() || "0",
          sugar: product.nutriments?.sugars_100g?.toString() || "0",
          sodium: product.nutriments?.sodium_100g ? (product.nutriments.sodium_100g * 1000).toString() : "0",
        });
      } catch (saveError) {
        console.error("Error saving to local database:", saveError);
        // Continue even if save fails
      }

      res.json({
        id: product.code,
        barcode: product.code,
        name: product.product_name || product.product_name_en || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: product.image_url || product.image_small_url || null,
        servingSize: product.serving_quantity || 100,
        servingUnit: product.serving_quantity_unit || 'g',
        calories: Math.round(product.nutriments?.['energy-kcal_100g'] || 0),
        protein: product.nutriments?.proteins_100g || 0,
        carbs: product.nutriments?.carbohydrates_100g || 0,
        fat: product.nutriments?.fat_100g || 0,
        fiber: product.nutriments?.fiber_100g || 0,
        sugar: product.nutriments?.sugars_100g || 0,
        sodium: product.nutriments?.sodium_100g ? product.nutriments.sodium_100g * 1000 : 0,
        source: 'openfoodfacts'
      });
    } catch (error) {
      console.error("Error looking up barcode:", error);
      res.status(500).json({ message: "Failed to lookup barcode" });
    }
  });

  // Custom food database management
  app.post('/api/food-database', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertFoodDatabaseSchema.parse(req.body);
      const food = await storage.addFoodToDatabase(validatedData);
      res.json(food);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating food database entry:", error);
      res.status(500).json({ message: "Failed to create food database entry" });
    }
  });

  app.get('/api/food-database/custom', isAuthenticated, async (req: any, res) => {
    try {
      const { search } = req.query;
      const foods = await storage.searchFoodByName(search as string || "");
      res.json(foods);
    } catch (error) {
      console.error("Error searching custom foods:", error);
      res.status(500).json({ message: "Failed to search custom foods" });
    }
  });

  // Weight log routes
  app.get('/api/weight-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getUserWeightLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching weight logs:", error);
      res.status(500).json({ message: "Failed to fetch weight logs" });
    }
  });

  app.post('/api/weight-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertWeightLogSchema.parse({ ...req.body, userId });
      const log = await storage.createWeightLog(validatedData);
      
      // Update weight logging streak
      await storage.updateStreak(userId, 'weight_logging', true);
      
      // Award points for logging weight
      await storage.addPoints(userId, 5, 'weight_logged', 'Logged weight');
      
      res.json(log);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.issues);
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating weight log:", error);
      res.status(500).json({ message: "Failed to create weight log" });
    }
  });

  // Body measurement routes
  app.get('/api/body-measurements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const measurements = await storage.getUserBodyMeasurements(userId);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching body measurements:", error);
      res.status(500).json({ message: "Failed to fetch body measurements" });
    }
  });

  app.post('/api/body-measurements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertBodyMeasurementSchema.parse({ ...req.body, userId });
      const measurement = await storage.createBodyMeasurement(validatedData);
      res.json(measurement);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Validation error:", error.issues);
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating body measurement:", error);
      res.status(500).json({ message: "Failed to create body measurement" });
    }
  });

  // Achievement routes
  app.get('/api/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get('/api/user-achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const userAchievements = await storage.getUserAchievements(userId);
      res.json(userAchievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // Streak routes
  app.get('/api/streaks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const streaks = await storage.getUserStreaks(userId);
      res.json(streaks);
    } catch (error) {
      console.error("Error fetching streaks:", error);
      res.status(500).json({ message: "Failed to fetch streaks" });
    }
  });

  // Goal routes
  app.get('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const goal = await storage.createUserGoal({ ...req.body, userId });
      res.json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  });

  // Dose escalation routes
  app.post('/api/dose-escalations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      
      // Verify medication belongs to user
      const { medicationId } = req.body;
      const medications = await storage.getUserMedications(userId);
      const medication = medications.find(m => m.id === medicationId);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const validatedData = insertDoseEscalationSchema.parse({ ...req.body, userId });
      const escalation = await storage.createDoseEscalation(validatedData);
      res.json(escalation);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating dose escalation:", error);
      res.status(500).json({ message: "Failed to create dose escalation" });
    }
  });

  app.get('/api/medications/:id/dose-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;
      
      // Verify medication belongs to user
      const medications = await storage.getUserMedications(userId);
      const medication = medications.find(m => m.id === id);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const history = await storage.getMedicationDoseHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching dose history:", error);
      res.status(500).json({ message: "Failed to fetch dose history" });
    }
  });

  // Hunger log routes
  app.post('/api/hunger-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertHungerLogSchema.parse({ ...req.body, userId });
      const log = await storage.createHungerLog(validatedData);
      
      // Award points for logging hunger
      await storage.addPoints(userId, 5, 'hunger_logged', 'Logged hunger/satiety data');
      
      res.json(log);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation failed", errors: error.issues });
      }
      console.error("Error creating hunger log:", error);
      res.status(500).json({ message: "Failed to create hunger log" });
    }
  });

  app.get('/api/hunger-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const logs = await storage.getUserHungerLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching hunger logs:", error);
      res.status(500).json({ message: "Failed to fetch hunger logs" });
    }
  });


  // Gamification routes
  app.get('/api/gamification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      let gamification = await storage.getUserGamification(userId);
      if (!gamification) {
        gamification = await storage.initializeUserGamification(userId);
      }
      res.json(gamification);
    } catch (error) {
      console.error("Error fetching gamification data:", error);
      res.status(500).json({ message: "Failed to fetch gamification data" });
    }
  });

  app.get('/api/point-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const transactions = await storage.getUserPointTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching point transactions:", error);
      res.status(500).json({ message: "Failed to fetch point transactions" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getUserNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const notification = await storage.markNotificationAsRead(req.params.id, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const deleted = await storage.deleteNotification(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Push subscription routes
  app.post('/api/push-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const pushSubscription = await storage.createPushSubscription({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json(pushSubscription);
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  app.get('/api/push-subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const subscriptions = await storage.getUserPushSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching push subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch push subscriptions" });
    }
  });

  app.delete('/api/push-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }

      const deleted = await storage.deletePushSubscription(endpoint, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ message: "Failed to delete push subscription" });
    }
  });

  // Recipe routes
  app.post('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertRecipeSchema.parse({ ...req.body, userId });
      const recipe = await storage.createRecipe(validatedData);
      res.status(201).json(recipe);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid recipe data", errors: (error as any).issues });
      }
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.get('/api/recipes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const recipes = await storage.getUserRecipes(userId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/public', isAuthenticated, async (req: any, res) => {
    try {
      const { limit = 50, isGlp1Friendly, isHighProtein, isLowCarb } = req.query;
      const filters = { isGlp1Friendly, isHighProtein, isLowCarb };
      const recipes = await storage.getPublicRecipes(parseInt(limit as string), filters);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching public recipes:", error);
      res.status(500).json({ message: "Failed to fetch public recipes" });
    }
  });

  app.get('/api/recipes/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const recipes = await storage.searchRecipes(q as string);
      res.json(recipes);
    } catch (error) {
      console.error("Error searching recipes:", error);
      res.status(500).json({ message: "Failed to search recipes" });
    }
  });

  app.get('/api/recipes/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const favorites = await storage.getUserFavoriteRecipes(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorite recipes:", error);
      res.status(500).json({ message: "Failed to fetch favorite recipes" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recipe = await storage.updateRecipe(id, req.body);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecipe(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  app.post('/api/recipes/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { id } = req.params;
      await storage.toggleRecipeFavorite(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error toggling recipe favorite:", error);
      res.status(500).json({ message: "Failed to toggle recipe favorite" });
    }
  });

  // External recipe API routes (TheMealDB)
  app.get('/api/recipes/external/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q as string)}`);
      const data = await response.json();
      
      if (!data.meals) {
        return res.json([]);
      }
      
      const formattedRecipes = data.meals.map((meal: any) => ({
        externalId: meal.idMeal,
        name: meal.strMeal,
        description: meal.strInstructions?.substring(0, 150) + '...',
        category: meal.strCategory,
        area: meal.strArea,
        image: meal.strMealThumb,
        tags: meal.strTags?.split(',') || [],
        ingredients: Array.from({ length: 20 }, (_, i) => i + 1)
          .map(i => ({
            ingredient: meal[`strIngredient${i}`],
            measure: meal[`strMeasure${i}`]
          }))
          .filter(item => item.ingredient && item.ingredient.trim())
          .map(item => `${item.measure} ${item.ingredient}`.trim()),
        instructions: meal.strInstructions,
        youtube: meal.strYoutube,
        source: meal.strSource
      }));
      
      res.json(formattedRecipes);
    } catch (error) {
      console.error("Error searching external recipes:", error);
      res.status(500).json({ message: "Failed to search external recipes" });
    }
  });

  app.get('/api/recipes/external/categories', isAuthenticated, async (req: any, res) => {
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/categories.php');
      const data = await response.json();
      res.json(data.categories || []);
    } catch (error) {
      console.error("Error fetching recipe categories:", error);
      res.status(500).json({ message: "Failed to fetch recipe categories" });
    }
  });

  app.get('/api/recipes/external/by-category', isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.query;
      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }
      
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category as string)}`);
      const data = await response.json();
      
      if (!data.meals) {
        return res.json([]);
      }
      
      const formattedRecipes = data.meals.map((meal: any) => ({
        externalId: meal.idMeal,
        name: meal.strMeal,
        image: meal.strMealThumb
      }));
      
      res.json(formattedRecipes);
    } catch (error) {
      console.error("Error fetching recipes by category:", error);
      res.status(500).json({ message: "Failed to fetch recipes by category" });
    }
  });

  app.get('/api/recipes/external/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
      const data = await response.json();
      
      if (!data.meals || data.meals.length === 0) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      const meal = data.meals[0];
      const formattedRecipe = {
        externalId: meal.idMeal,
        name: meal.strMeal,
        description: meal.strInstructions,
        category: meal.strCategory,
        area: meal.strArea,
        image: meal.strMealThumb,
        tags: meal.strTags?.split(',') || [],
        ingredients: Array.from({ length: 20 }, (_, i) => i + 1)
          .map(i => ({
            ingredient: meal[`strIngredient${i}`],
            measure: meal[`strMeasure${i}`]
          }))
          .filter(item => item.ingredient && item.ingredient.trim())
          .map(item => `${item.measure} ${item.ingredient}`.trim()),
        instructions: meal.strInstructions.split('\r\n').filter((s: string) => s.trim()),
        youtube: meal.strYoutube,
        source: meal.strSource
      };
      
      res.json(formattedRecipe);
    } catch (error) {
      console.error("Error fetching external recipe details:", error);
      res.status(500).json({ message: "Failed to fetch recipe details" });
    }
  });

  app.post('/api/recipes/import/:externalId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { externalId } = req.params;
      
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${externalId}`);
      const data = await response.json();
      
      if (!data.meals || data.meals.length === 0) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      const meal = data.meals[0];
      const ingredients = Array.from({ length: 20 }, (_, i) => i + 1)
        .map(i => ({
          ingredient: meal[`strIngredient${i}`],
          measure: meal[`strMeasure${i}`]
        }))
        .filter(item => item.ingredient && item.ingredient.trim())
        .map(item => `${item.measure} ${item.ingredient}`.trim());
      
      const recipeData = {
        userId,
        name: meal.strMeal,
        description: meal.strInstructions?.substring(0, 200) || '',
        recipeType: 'dinner',
        difficulty: 'medium',
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        ingredients,
        instructions: meal.strInstructions.split('\r\n').filter((s: string) => s.trim()),
        calories: 300,
        protein: '25',
        carbs: '30',
        fat: '10',
        isGlp1Friendly: false,
        isHighProtein: false,
        isLowCarb: false,
        isPublic: false
      };
      
      const validatedData = insertRecipeSchema.parse(recipeData);
      const recipe = await storage.createRecipe(validatedData);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error importing recipe:", error);
      res.status(500).json({ message: "Failed to import recipe" });
    }
  });

  // Meal plan routes
  app.post('/api/meal-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertMealPlanSchema.parse({ ...req.body, userId });
      const mealPlan = await storage.createMealPlan(validatedData);
      res.status(201).json(mealPlan);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid meal plan data", errors: (error as any).issues });
      }
      console.error("Error creating meal plan:", error);
      res.status(500).json({ message: "Failed to create meal plan" });
    }
  });

  app.get('/api/meal-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const mealPlans = await storage.getUserMealPlans(userId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.get('/api/meal-plans/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const mealPlan = await storage.getActiveMealPlan(userId);
      res.json(mealPlan || null);
    } catch (error) {
      console.error("Error fetching active meal plan:", error);
      res.status(500).json({ message: "Failed to fetch active meal plan" });
    }
  });

  app.put('/api/meal-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const mealPlan = await storage.updateMealPlan(id, req.body);
      res.json(mealPlan);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });

  app.delete('/api/meal-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMealPlan(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  // Meal plan entry routes
  app.post('/api/meal-plan-entries', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMealPlanEntrySchema.parse(req.body);
      const entry = await storage.createMealPlanEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid meal plan entry data", errors: (error as any).issues });
      }
      console.error("Error creating meal plan entry:", error);
      res.status(500).json({ message: "Failed to create meal plan entry" });
    }
  });

  app.get('/api/meal-plan-entries/:mealPlanId', isAuthenticated, async (req: any, res) => {
    try {
      const { mealPlanId } = req.params;
      const entries = await storage.getMealPlanEntries(mealPlanId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching meal plan entries:", error);
      res.status(500).json({ message: "Failed to fetch meal plan entries" });
    }
  });

  app.put('/api/meal-plan-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.updateMealPlanEntry(id, req.body);
      res.json(entry);
    } catch (error) {
      console.error("Error updating meal plan entry:", error);
      res.status(500).json({ message: "Failed to update meal plan entry" });
    }
  });

  app.delete('/api/meal-plan-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMealPlanEntry(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meal plan entry:", error);
      res.status(500).json({ message: "Failed to delete meal plan entry" });
    }
  });

  // Meal prep routes
  app.post('/api/meal-prep', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertMealPrepScheduleSchema.parse({ ...req.body, userId });
      const schedule = await storage.createMealPrepSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid meal prep schedule data", errors: (error as any).issues });
      }
      console.error("Error creating meal prep schedule:", error);
      res.status(500).json({ message: "Failed to create meal prep schedule" });
    }
  });

  app.get('/api/meal-prep', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const schedules = await storage.getUserMealPrepSchedules(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching meal prep schedules:", error);
      res.status(500).json({ message: "Failed to fetch meal prep schedules" });
    }
  });

  app.put('/api/meal-prep/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const schedule = await storage.updateMealPrepSchedule(id, req.body);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating meal prep schedule:", error);
      res.status(500).json({ message: "Failed to update meal prep schedule" });
    }
  });

  app.delete('/api/meal-prep/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMealPrepSchedule(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meal prep schedule:", error);
      res.status(500).json({ message: "Failed to delete meal prep schedule" });
    }
  });

  // Nutritional recommendations routes
  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const recommendations = await storage.getUserRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const validatedData = insertNutritionalRecommendationSchema.parse({ ...req.body, userId });
      const recommendation = await storage.createRecommendation(validatedData);
      res.status(201).json(recommendation);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid recommendation data", errors: (error as any).issues });
      }
      console.error("Error creating recommendation:", error);
      res.status(500).json({ message: "Failed to create recommendation" });
    }
  });

  // AI Recipe Chat endpoint - Claude integration
  app.post('/api/ai/recipe-chat', isAuthenticated, async (req: any, res) => {
    try {
      const { messages, systemPrompt } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }

      if (!systemPrompt || typeof systemPrompt !== 'string') {
        return res.status(400).json({ message: "System prompt is required" });
      }

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey || anthropicApiKey === 'your_anthropic_api_key_here') {
        logger.error('Anthropic API key not configured');
        return res.status(500).json({
          message: "AI service is not configured. Please add your Anthropic API key to the environment variables."
        });
      }

      const anthropic = new Anthropic({
        apiKey: anthropicApiKey,
      });

      // Format messages for Claude API (remove system messages from user conversation)
      const formattedMessages = messages
        .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));

      // Call Claude API
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: formattedMessages,
      });

      // Extract the text response
      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : 'I apologize, but I could not generate a response.';

      res.json({ message: assistantMessage });
    } catch (error: any) {
      console.error("Error calling Claude API:", error);

      // Provide more specific error messages
      if (error.status === 401) {
        return res.status(500).json({ message: "AI service authentication failed. Please check the API key." });
      } else if (error.status === 429) {
        return res.status(429).json({ message: "AI service rate limit exceeded. Please try again later." });
      } else if (error.message?.includes('API key')) {
        return res.status(500).json({ message: "AI service configuration error. Please contact support." });
      }

      res.status(500).json({ message: "Failed to get AI response. Please try again." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
