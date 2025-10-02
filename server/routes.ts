import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth0 } from "./auth0";
import { setupDevAuth, isAuthenticated, DEV_MODE } from "./devAuth";
import { logger } from "./logger";
import {
  insertMedicationSchema,
  insertMedicationLogSchema,
  insertFoodEntrySchema,
  insertWeightLogSchema,
  insertBodyMeasurementSchema,
  updateUserProfileSchema,
  insertDoseEscalationSchema,
  insertHungerLogSchema,
  insertFoodDatabaseSchema
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
  // Setup authentication (Dev mode or Auth0)
  if (DEV_MODE) {
    console.log('🔧 Running in DEV AUTH mode - using simple login');
    setupDevAuth(app);
  } else {
    console.log('🔐 Running in AUTH0 mode');
    setupAuth0(app);
  }

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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      console.log("Updating profile for user:", userId, "with data:", req.body);
      const validatedData = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(userId, validatedData);
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      const medications = await storage.getUserMedications(userId);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ message: "Failed to fetch medications" });
    }
  });

  app.post('/api/medications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      const validatedData = insertMedicationSchema.parse({ ...req.body, userId });
      const medication = await storage.createMedication(validatedData);
      res.json(medication);
    } catch (error) {
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      const validatedData = insertMedicationLogSchema.parse({ ...req.body, userId });
      const log = await storage.createMedicationLog(validatedData);
      
      // Award points for taking medication
      await storage.addPoints(userId, 5, 'medication_taken', 'Logged medication');
      
      res.json(log);
    } catch (error) {
      console.error("Error creating medication log:", error);
      res.status(500).json({ message: "Failed to create medication log" });
    }
  });

  // Food entry routes
  app.get('/api/food-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const entries = await storage.getUserFoodEntries(userId, date);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching food entries:", error);
      res.status(500).json({ message: "Failed to fetch food entries" });
    }
  });

  app.post('/api/food-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      const validatedData = insertFoodEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createFoodEntry(validatedData);
      
      // Update food tracking streak
      await storage.updateStreak(userId, 'food_tracking', true);
      
      // Award points for logging food
      await storage.addPoints(userId, 3, 'food_logged', 'Logged food entry');
      
      res.json(entry);
    } catch (error) {
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
        imageUrl: food.imageUrl,
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      const validatedData = insertWeightLogSchema.parse({ ...req.body, userId });
      const log = await storage.createWeightLog(validatedData);
      
      // Update weight logging streak
      await storage.updateStreak(userId, 'weight_logging', true);
      
      // Award points for logging weight
      await storage.addPoints(userId, 5, 'weight_logged', 'Logged weight');
      
      res.json(log);
    } catch (error) {
      console.error("Error creating weight log:", error);
      res.status(500).json({ message: "Failed to create weight log" });
    }
  });

  // Body measurement routes
  app.get('/api/body-measurements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      const measurements = await storage.getUserBodyMeasurements(userId);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching body measurements:", error);
      res.status(500).json({ message: "Failed to fetch body measurements" });
    }
  });

  app.post('/api/body-measurements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
      const validatedData = insertBodyMeasurementSchema.parse({ ...req.body, userId });
      const measurement = await storage.createBodyMeasurement(validatedData);
      res.json(measurement);
    } catch (error) {
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
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
      const userId = req.oidc.user.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.oidc.user.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
