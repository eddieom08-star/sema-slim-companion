import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const medications = await storage.getUserMedications(userId);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ message: "Failed to fetch medications" });
    }
  });

  app.post('/api/medications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Weight log routes
  app.get('/api/weight-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const measurements = await storage.getUserBodyMeasurements(userId);
      res.json(measurements);
    } catch (error) {
      console.error("Error fetching body measurements:", error);
      res.status(500).json({ message: "Failed to fetch body measurements" });
    }
  });

  app.post('/api/body-measurements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const goals = await storage.getUserGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const logs = await storage.getUserHungerLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching hunger logs:", error);
      res.status(500).json({ message: "Failed to fetch hunger logs" });
    }
  });

  // Food database routes (barcode scanning)
  app.get('/api/food-database/barcode/:barcode', isAuthenticated, async (req: any, res) => {
    try {
      const { barcode } = req.params;
      const food = await storage.searchFoodByBarcode(barcode);
      if (food) {
        res.json(food);
      } else {
        res.status(404).json({ message: "Food not found" });
      }
    } catch (error) {
      console.error("Error searching food by barcode:", error);
      res.status(500).json({ message: "Failed to search food" });
    }
  });

  app.get('/api/food-database/search', isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const foods = await storage.searchFoodByName(query, limit);
      res.json(foods);
    } catch (error) {
      console.error("Error searching food:", error);
      res.status(500).json({ message: "Failed to search food" });
    }
  });

  app.post('/api/food-database', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertFoodDatabaseSchema.parse({ ...req.body, source: 'user_contributed' });
      const food = await storage.addFoodToDatabase(validatedData);
      res.json(food);
    } catch (error) {
      console.error("Error adding food to database:", error);
      res.status(500).json({ message: "Failed to add food to database" });
    }
  });

  // Gamification routes
  app.get('/api/gamification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const transactions = await storage.getUserPointTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching point transactions:", error);
      res.status(500).json({ message: "Failed to fetch point transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
