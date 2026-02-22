import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "./logger";
import { clerkMiddleware, requireAuth } from "./clerkAuth";
import monetizationRoutes from "./routes/monetization";
import { entitlementsService } from "./services/entitlements";
import { FEATURE_TYPES } from "@shared/features";

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

  // Debug endpoint - disabled in production for security
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug/headers', async (req, res) => {
      const authHeader = req.headers.authorization;
      res.json({
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 30),
        authHeaderLength: authHeader?.length,
        allHeaders: Object.keys(req.headers),
        clerkAuth: (req as any).auth || 'not set by middleware',
      });
    });
  }

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
      const userId = req.auth.userId;
      const medication = await storage.updateMedication(id, userId, req.body);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found or access denied" });
      }
      res.json(medication);
    } catch (error) {
      console.error("Error updating medication:", error);
      res.status(500).json({ message: "Failed to update medication" });
    }
  });

  app.delete('/api/medications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const deleted = await storage.deleteMedication(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Medication not found or access denied" });
      }
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

      // Get entitlements and calculate cutoff date for history filtering
      const entitlements = await entitlementsService.getUserEntitlements(userId);
      let cutoffDate: Date | undefined;
      if (entitlements.historyRetentionDays !== -1) {
        cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - entitlements.historyRetentionDays);
      }

      // Pass cutoff to database query for efficient filtering
      const logs = await storage.getUserMedicationLogs(userId, limit, cutoffDate);

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

      // Apply history retention limit based on entitlements
      const entitlements = await entitlementsService.getUserEntitlements(userId);
      let filteredEntries = entries;
      if (entitlements.historyRetentionDays !== -1) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - entitlements.historyRetentionDays);
        filteredEntries = entries.filter((entry: any) => new Date(entry.consumedAt) >= cutoffDate);
      }

      // Apply limit if specified
      const limitedEntries = limit ? filteredEntries.slice(0, limit) : filteredEntries;

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
      const userId = req.auth.userId;
      const entry = await storage.updateFoodEntry(id, userId, req.body);
      if (!entry) {
        return res.status(404).json({ message: "Food entry not found or access denied" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error updating food entry:", error);
      res.status(500).json({ message: "Failed to update food entry" });
    }
  });

  app.delete('/api/food-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const deleted = await storage.deleteFoodEntry(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Food entry not found or access denied" });
      }
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

      // Use USDA FoodData Central API (more reliable than Open Food Facts)
      // DEMO_KEY has rate limits - consider registering for a free API key at https://fdc.nal.usda.gov/api-key-signup.html
      const usdaApiKey = process.env.USDA_API_KEY || 'DEMO_KEY';
      const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaApiKey}&query=${encodeURIComponent(q)}&pageSize=${searchLimit - localResults.length}&dataType=Branded,Foundation,SR%20Legacy`;

      const response = await fetchWithTimeout(searchUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      }, 10000); // 10 second timeout for search

      if (!response.ok) {
        // If API fails, just return local results
        console.log('USDA API failed, returning local results only');
        return res.json(localResults);
      }

      const data = await response.json();

      // Transform USDA FoodData to our format
      const remoteProducts = data.foods?.map((food: any) => {
        // Get nutrients - USDA provides per 100g values
        const nutrients = food.foodNutrients || [];
        const getNutrient = (name: string) => {
          const nutrient = nutrients.find((n: any) =>
            n.nutrientName?.toLowerCase().includes(name.toLowerCase()) ||
            n.nutrientNumber === name
          );
          return nutrient?.value || 0;
        };

        return {
          id: food.fdcId?.toString(),
          barcode: food.gtinUpc || '',
          name: food.description || food.lowercaseDescription || 'Unknown Food',
          brand: food.brandOwner || food.brandName || '',
          imageUrl: null, // USDA doesn't provide images
          servingSize: food.servingSize || 100,
          servingUnit: food.servingSizeUnit || 'g',
          calories: Math.round(getNutrient('Energy') || getNutrient('208')),
          protein: Number((getNutrient('Protein') || getNutrient('203')).toFixed(1)),
          carbs: Number((getNutrient('Carbohydrate') || getNutrient('205')).toFixed(1)),
          fat: Number((getNutrient('Total lipid') || getNutrient('204')).toFixed(1)),
          fiber: Number((getNutrient('Fiber') || getNutrient('291')).toFixed(1)),
          sugar: Number((getNutrient('Sugars') || getNutrient('269')).toFixed(1)),
          sodium: Math.round(getNutrient('Sodium') || getNutrient('307')),
          source: 'usda'
        };
      }) || [];

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
      const userId = req.auth?.userId;
      const { barcode } = req.params;

      // Check barcode scan entitlement
      const canScan = await entitlementsService.canUseFeature(userId, FEATURE_TYPES.BARCODE_SCAN, 1);
      if (!canScan.allowed) {
        logger.info('Barcode scan blocked - limit reached', { userId, reason: canScan.reason });
        return res.status(403).json({
          error: 'limit_reached',
          reason: canScan.reason,
          upsellType: canScan.upsellType,
          message: 'You have reached your daily barcode scan limit. Upgrade to Pro for unlimited scanning.'
        });
      }

      // First, try to find in our local database
      const localFood = await storage.searchFoodByBarcode(barcode);
      if (localFood) {
        // Record barcode scan usage
        await entitlementsService.consumeFeature(userId, FEATURE_TYPES.BARCODE_SCAN, 1);
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

      // Record barcode scan usage
      await entitlementsService.consumeFeature(userId, FEATURE_TYPES.BARCODE_SCAN, 1);

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

      // Apply history retention limit based on entitlements
      const entitlements = await entitlementsService.getUserEntitlements(userId);
      if (entitlements.historyRetentionDays !== -1) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - entitlements.historyRetentionDays);
        const filteredLogs = logs.filter((log: any) => new Date(log.loggedAt) >= cutoffDate);
        return res.json(filteredLogs);
      }

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
      const userId = req.auth.userId;
      const achievements = await storage.getAllAchievements();

      // Limit visible achievements based on entitlements
      const entitlements = await entitlementsService.getUserEntitlements(userId);
      if (entitlements.achievementsAvailable !== -1) {
        const limitedAchievements = achievements.slice(0, entitlements.achievementsAvailable);
        return res.json(limitedAchievements);
      }

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

      // Limit visible achievements based on entitlements
      const entitlements = await entitlementsService.getUserEntitlements(userId);
      if (entitlements.achievementsAvailable !== -1) {
        const limitedAchievements = userAchievements.slice(0, entitlements.achievementsAvailable);
        return res.json(limitedAchievements);
      }

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

      // Apply history retention limit based on entitlements
      const entitlements = await entitlementsService.getUserEntitlements(userId);
      if (entitlements.historyRetentionDays !== -1) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - entitlements.historyRetentionDays);
        const filteredLogs = logs.filter((log: any) => new Date(log.loggedAt) >= cutoffDate);
        return res.json(filteredLogs);
      }

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
      const userId = req.auth.userId;
      const recipe = await storage.updateRecipe(id, userId, req.body);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found or access denied" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const deleted = await storage.deleteRecipe(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Recipe not found or access denied" });
      }
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
      const userId = req.auth.userId;
      const mealPlan = await storage.updateMealPlan(id, userId, req.body);
      if (!mealPlan) {
        return res.status(404).json({ message: "Meal plan not found or access denied" });
      }
      res.json(mealPlan);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });

  app.delete('/api/meal-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const deleted = await storage.deleteMealPlan(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Meal plan not found or access denied" });
      }
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
      const userId = req.auth.userId;
      const entry = await storage.updateMealPlanEntry(id, userId, req.body);
      if (!entry) {
        return res.status(404).json({ message: "Meal plan entry not found or access denied" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error updating meal plan entry:", error);
      res.status(500).json({ message: "Failed to update meal plan entry" });
    }
  });

  app.delete('/api/meal-plan-entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const deleted = await storage.deleteMealPlanEntry(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Meal plan entry not found or access denied" });
      }
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
      const userId = req.auth.userId;
      const schedule = await storage.updateMealPrepSchedule(id, userId, req.body);
      if (!schedule) {
        return res.status(404).json({ message: "Meal prep schedule not found or access denied" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error updating meal prep schedule:", error);
      res.status(500).json({ message: "Failed to update meal prep schedule" });
    }
  });

  app.delete('/api/meal-prep/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const deleted = await storage.deleteMealPrepSchedule(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Meal prep schedule not found or access denied" });
      }
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

  // Diagnostic endpoint to test Anthropic API key
  app.get('/api/ai/test', isAuthenticated, async (req: any, res) => {
    try {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      if (!anthropicApiKey || anthropicApiKey === 'your_anthropic_api_key_here') {
        return res.status(500).json({
          success: false,
          message: "Anthropic API key not configured",
          hasKey: false
        });
      }

      // Try to import and initialize Anthropic
      const anthropicModule = await import('@anthropic-ai/sdk');
      const Anthropic = anthropicModule.Anthropic || anthropicModule.default;
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });

      // Try a simple API call with minimal tokens
      const testResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Use cheapest model for testing
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      res.json({
        success: true,
        message: "Anthropic API key is valid and working",
        hasKey: true,
        keyPrefix: anthropicApiKey.substring(0, 15),
        modelTested: 'claude-3-haiku-20240307',
        responseReceived: !!testResponse
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Anthropic API test failed",
        error: error.message,
        status: error.status,
        type: error.type
      });
    }
  });

  // AI Recipe Chat endpoint - Claude integration
  app.post('/api/ai/recipe-chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth?.userId;
      logger.info('Recipe chat endpoint called', {
        userId,
        hasMessages: !!req.body.messages,
        hasSystemPrompt: !!req.body.systemPrompt
      });

      // Check entitlements before allowing recipe generation
      const canUse = await entitlementsService.canUseFeature(userId, FEATURE_TYPES.AI_RECIPE, 1);
      if (!canUse.allowed) {
        logger.info('Recipe generation blocked - limit reached', { userId, reason: canUse.reason });
        return res.status(403).json({
          error: 'limit_reached',
          reason: canUse.reason,
          upsellType: canUse.upsellType,
          message: 'You have reached your monthly recipe generation limit. Upgrade to Pro for more recipes or purchase AI tokens.'
        });
      }

      const { messages, systemPrompt } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }

      if (!systemPrompt || typeof systemPrompt !== 'string') {
        return res.status(400).json({ message: "System prompt is required" });
      }

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      logger.info('Checking Anthropic API key', {
        hasKey: !!anthropicApiKey,
        keyPrefix: anthropicApiKey?.substring(0, 10)
      });

      if (!anthropicApiKey || anthropicApiKey === 'your_anthropic_api_key_here') {
        logger.error('Anthropic API key not configured');
        return res.status(500).json({
          message: "AI service is not configured. Please add your Anthropic API key to the environment variables."
        });
      }

      logger.info('Dynamically importing Anthropic SDK');
      let Anthropic;
      let anthropic;
      try {
        // Dynamically import for better serverless compatibility
        const anthropicModule = await import('@anthropic-ai/sdk');
        Anthropic = anthropicModule.Anthropic || anthropicModule.default;
        logger.info('Anthropic SDK imported successfully');

        anthropic = new Anthropic({
          apiKey: anthropicApiKey,
        });
        logger.info('Anthropic client initialized successfully');
      } catch (initError: any) {
        logger.error('Failed to initialize Anthropic client', initError);
        console.error('Anthropic initialization error details:', {
          message: initError.message,
          stack: initError.stack,
          name: initError.name
        });
        return res.status(500).json({
          message: "Failed to initialize AI service",
          error: initError.message,
          details: process.env.NODE_ENV === 'development' ? initError.stack : undefined
        });
      }

      // Format messages for Claude API (remove system messages from user conversation)
      const formattedMessages = messages
        .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content
        }));

      // Try multiple model names in order of preference
      // The API key might not have access to newer models
      const modelPriority = [
        'claude-sonnet-4-5-20250929',  // Claude Sonnet 4.5
        'claude-3-5-sonnet-20241022',  // Claude 3.5 Sonnet v2 (fallback)
        'claude-haiku-4-5-20251001',   // Claude Haiku 4.5 (fallback)
        'claude-3-haiku-20240307'      // Claude 3 Haiku (last resort)
      ];

      let model = modelPriority[0]; // Start with the newest

      logger.info('Calling Claude API', {
        messageCount: formattedMessages.length,
        model,
        availableModels: modelPriority
      });

      // Call Claude API with fallback model support
      let response;
      let lastError;

      for (let i = 0; i < modelPriority.length; i++) {
        model = modelPriority[i];
        try {
          logger.info(`Trying model: ${model}`);
          response = await anthropic.messages.create({
            model,
            max_tokens: 2048,
            system: systemPrompt,
            messages: formattedMessages,
          });
          logger.info(`Claude API call successful with model: ${model}`);
          break; // Success! Exit the loop
        } catch (apiError: any) {
          lastError = apiError;
          logger.warn(`Model ${model} failed with status ${apiError.status}`);

          // If it's a 404 (model not found), try the next model
          if (apiError.status === 404 && i < modelPriority.length - 1) {
            logger.info(`Model ${model} not found, trying next model...`);
            continue;
          }

          // If it's not a 404, or we're on the last model, throw the error
          logger.error('Claude API call failed', apiError);
          console.error('Anthropic messages.create error:', {
            message: apiError.message,
            status: apiError.status,
            type: apiError.type,
            error: apiError.error,
            modelAttempted: model
          });
          throw apiError;
        }
      }

      // If we tried all models and none worked
      if (!response && lastError) {
        throw lastError;
      }

      if (!response) {
        return res.status(500).json({ message: "Failed to get response from AI service" });
      }

      // Extract the text response
      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : 'I apologize, but I could not generate a response.';

      // Record usage after successful generation
      await entitlementsService.consumeFeature(userId, FEATURE_TYPES.AI_RECIPE, 1);

      res.json({ message: assistantMessage });
    } catch (error: any) {
      console.error("Error calling Claude API:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        stack: error.stack,
        name: error.name,
        type: error.type,
        response: error.response,
        cause: error.cause
      });

      // Log the full error object for debugging
      logger.error('Full Claude API error:', error);

      // Provide more specific error messages
      if (error.status === 401) {
        return res.status(500).json({
          message: "AI service authentication failed. Please check the API key.",
          error: error.message
        });
      } else if (error.status === 429) {
        return res.status(429).json({
          message: "AI service rate limit exceeded. Please try again later.",
          error: error.message
        });
      } else if (error.message?.includes('API key')) {
        return res.status(500).json({
          message: "AI service configuration error. Please contact support.",
          error: error.message
        });
      }

      // Return detailed error in all environments for debugging
      res.status(500).json({
        message: "Failed to get AI response",
        error: error.message,
        errorType: error.name || error.type,
        statusCode: error.status,
        details: error.cause?.message || error.response?.data?.message
      });
    }
  });

  // AI Recipe Scan endpoint - Claude vision integration for extracting recipes from images
  app.post('/api/ai/scan-recipe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.auth?.userId;
      logger.info('Recipe scan endpoint called', {
        userId,
        hasImage: !!req.body.image
      });

      // Check AI recipe entitlement (uses same quota as recipe chat)
      const canUse = await entitlementsService.canUseFeature(userId, FEATURE_TYPES.AI_RECIPE, 1);
      if (!canUse.allowed) {
        logger.info('Recipe scan blocked - limit reached', { userId, reason: canUse.reason });
        return res.status(403).json({
          error: 'limit_reached',
          reason: canUse.reason,
          upsellType: canUse.upsellType,
          message: 'You have reached your monthly AI recipe limit. Upgrade to Pro for more or purchase AI tokens.'
        });
      }

      const { image } = req.body;

      if (!image || !image.base64 || !image.mediaType) {
        return res.status(400).json({ message: "Image data is required (base64 and mediaType)" });
      }

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey || anthropicApiKey === 'your_anthropic_api_key_here') {
        logger.error('Anthropic API key not configured');
        return res.status(500).json({
          message: "AI service is not configured. Please add your Anthropic API key to the environment variables."
        });
      }

      // Initialize Anthropic client
      let anthropic;
      try {
        const anthropicModule = await import('@anthropic-ai/sdk');
        const Anthropic = anthropicModule.Anthropic || anthropicModule.default;
        anthropic = new Anthropic({ apiKey: anthropicApiKey });
      } catch (initError: any) {
        logger.error('Failed to initialize Anthropic client', initError);
        return res.status(500).json({
          message: "Failed to initialize AI service",
          error: initError.message
        });
      }

      // System prompt for recipe extraction
      const systemPrompt = `You are a recipe extraction assistant. Analyze the image provided and extract any recipe information you can find.

If this is a recipe image, cookbook page, or food receipt, extract the following in JSON format:
{
  "found": true,
  "recipe": {
    "name": "Recipe name",
    "description": "Brief description",
    "recipeType": "breakfast|lunch|dinner|snack|dessert",
    "difficulty": "easy|medium|hard",
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4,
    "ingredients": [{"name": "ingredient", "quantity": "1", "unit": "cup"}],
    "instructions": "Step by step instructions as a string",
    "calories": 300,
    "protein": "25",
    "carbs": "30",
    "fat": "10",
    "isGlp1Friendly": false,
    "isHighProtein": false,
    "isLowCarb": false,
    "isPublic": false
  }
}

If the image doesn't contain recipe information, respond with:
{
  "found": false,
  "message": "Brief explanation of what was found instead"
}

Always respond with valid JSON only, no additional text.`;

      // Call Claude API with image
      const modelPriority = [
        'claude-sonnet-4-5-20250929',  // Claude Sonnet 4.5
        'claude-3-5-sonnet-20241022',  // Claude 3.5 Sonnet v2 (fallback)
        'claude-haiku-4-5-20251001',   // Claude Haiku 4.5 (fallback)
        'claude-3-haiku-20240307'      // Claude 3 Haiku (last resort)
      ];

      let response;
      let lastError;

      for (const model of modelPriority) {
        try {
          logger.info(`Trying model for image scan: ${model}`);
          response = await anthropic.messages.create({
            model,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: image.mediaType,
                    data: image.base64,
                  },
                },
                {
                  type: 'text',
                  text: 'Please analyze this image and extract any recipe information. Respond with JSON only.'
                }
              ],
            }],
          });
          logger.info(`Image scan successful with model: ${model}`);
          break;
        } catch (apiError: any) {
          lastError = apiError;
          logger.warn(`Model ${model} failed for image scan: ${apiError.message}`);

          // If it's a 404 (model not found), try the next model
          if (apiError.status === 404) {
            continue;
          }

          // For image dimension errors, provide a helpful message
          if (apiError.message?.includes('image dimensions') || apiError.message?.includes('2000 pixels')) {
            return res.status(400).json({
              message: "Image is too large. Please use an image with dimensions under 2000x2000 pixels.",
              error: apiError.message
            });
          }

          throw apiError;
        }
      }

      if (!response && lastError) {
        throw lastError;
      }

      if (!response) {
        return res.status(500).json({ message: "Failed to get response from AI service" });
      }

      // Extract the text response
      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        return res.status(500).json({ message: "Unexpected response format from AI" });
      }

      // Parse the JSON response
      try {
        const parsed = JSON.parse(textContent.text);

        if (parsed.found && parsed.recipe) {
          // Record AI usage only after successful recipe extraction
          await entitlementsService.consumeFeature(userId, FEATURE_TYPES.AI_RECIPE, 1);

          const recipe = parsed.recipe;

          // Normalize difficulty to valid DB enum values
          const difficultyMap: Record<string, string> = {
            'beginner': 'easy', 'simple': 'easy', 'easy': 'easy',
            'intermediate': 'medium', 'moderate': 'medium', 'medium': 'medium',
            'advanced': 'hard', 'difficult': 'hard', 'hard': 'hard', 'expert': 'hard',
          };
          const validDifficulties = ['easy', 'medium', 'hard'];
          recipe.difficulty = difficultyMap[recipe.difficulty?.toLowerCase()]
            || (validDifficulties.includes(recipe.difficulty?.toLowerCase()) ? recipe.difficulty.toLowerCase() : 'medium');

          // Normalize recipeType to valid DB enum values
          const validRecipeTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];
          const recipeTypeMap: Record<string, string> = {
            'brunch': 'breakfast', 'supper': 'dinner', 'appetizer': 'snack',
            'side': 'snack', 'treat': 'dessert', 'sweet': 'dessert',
          };
          recipe.recipeType = recipeTypeMap[recipe.recipeType?.toLowerCase()]
            || (validRecipeTypes.includes(recipe.recipeType?.toLowerCase()) ? recipe.recipeType.toLowerCase() : 'dinner');

          // Coerce numeric fields
          recipe.calories = parseInt(recipe.calories) || 0;
          recipe.prepTime = parseInt(recipe.prepTime) || 0;
          recipe.cookTime = parseInt(recipe.cookTime) || 0;
          recipe.servings = parseInt(recipe.servings) || 1;

          // Ensure string fields for decimal columns
          recipe.protein = String(recipe.protein || '0');
          recipe.carbs = String(recipe.carbs || '0');
          recipe.fat = String(recipe.fat || '0');

          // Ensure instructions is a string
          if (Array.isArray(recipe.instructions)) {
            recipe.instructions = recipe.instructions.join('\n');
          }

          // Normalize ingredients to [{name, quantity, unit}]
          if (Array.isArray(recipe.ingredients)) {
            recipe.ingredients = recipe.ingredients.map((ing: any) => {
              if (typeof ing === 'string') return { name: ing, quantity: '', unit: '' };
              return { name: ing.name || String(ing), quantity: String(ing.quantity || ''), unit: String(ing.unit || '') };
            });
          }

          // Ensure boolean fields
          recipe.isGlp1Friendly = !!recipe.isGlp1Friendly;
          recipe.isHighProtein = !!recipe.isHighProtein;
          recipe.isLowCarb = !!recipe.isLowCarb;
          recipe.isPublic = false;

          res.json({ recipe });
        } else {
          res.json({ message: parsed.message || "No recipe found in the image" });
        }
      } catch (parseError) {
        // If JSON parsing fails, return the raw message
        logger.warn('Failed to parse recipe JSON, returning raw message');
        res.json({ message: textContent.text });
      }
    } catch (error: any) {
      console.error("Error scanning recipe:", error);
      logger.error('Recipe scan error:', error);

      if (error.status === 401) {
        return res.status(500).json({
          message: "AI service authentication failed. Please check the API key.",
          error: error.message
        });
      } else if (error.status === 429) {
        return res.status(429).json({
          message: "AI service rate limit exceeded. Please try again later.",
          error: error.message
        });
      }

      res.status(500).json({
        message: "Failed to scan recipe",
        error: error.message
      });
    }
  });

  // Mount monetization routes
  app.use('/api', monetizationRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
