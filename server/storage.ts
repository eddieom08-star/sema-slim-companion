import {
  users,
  medications,
  medicationLogs,
  foodEntries,
  weightLogs,
  bodyMeasurements,
  achievements,
  userAchievements,
  dailyStreaks,
  userGoals,
  doseEscalations,
  hungerLogs,
  foodDatabase,
  userGamification,
  pointTransactions,
  notifications,
  pushSubscriptions,
  recipes,
  recipeFavorites,
  mealPlans,
  mealPlanEntries,
  mealPrepSchedules,
  nutritionalRecommendations,
  type User,
  type UpsertUser,
  type Medication,
  type InsertMedication,
  type MedicationLog,
  type InsertMedicationLog,
  type FoodEntry,
  type InsertFoodEntry,
  type WeightLog,
  type InsertWeightLog,
  type BodyMeasurement,
  type InsertBodyMeasurement,
  type Achievement,
  type UserAchievement,
  type DailyStreak,
  type UserGoal,
  type DoseEscalation,
  type InsertDoseEscalation,
  type HungerLog,
  type InsertHungerLog,
  type FoodDatabase,
  type InsertFoodDatabase,
  type UserGamification,
  type PointTransaction,
  type InsertPointTransaction,
  type Notification,
  type InsertNotification,
  type PushSubscription,
  type InsertPushSubscription,
  type Recipe,
  type InsertRecipe,
  type RecipeFavorite,
  type MealPlan,
  type InsertMealPlan,
  type MealPlanEntry,
  type InsertMealPlanEntry,
  type MealPrepSchedule,
  type InsertMealPrepSchedule,
  type NutritionalRecommendation,
  type InsertNutritionalRecommendation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User>;

  // Medication operations
  createMedication(medication: InsertMedication): Promise<Medication>;
  getUserMedications(userId: string): Promise<Medication[]>;
  updateMedication(id: string, userId: string, data: Partial<Medication>): Promise<Medication | null>;
  deleteMedication(id: string, userId: string): Promise<boolean>;

  // Medication log operations
  createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog>;
  getUserMedicationLogs(userId: string, limit?: number, cutoffDate?: Date): Promise<MedicationLog[]>;
  getMedicationLogsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MedicationLog[]>;

  // Food entry operations
  createFoodEntry(entry: InsertFoodEntry): Promise<FoodEntry>;
  getUserFoodEntries(userId: string, date?: Date, cutoffDate?: Date): Promise<FoodEntry[]>;
  getFoodEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<FoodEntry[]>;
  updateFoodEntry(id: string, userId: string, data: Partial<FoodEntry>): Promise<FoodEntry | null>;
  deleteFoodEntry(id: string, userId: string): Promise<boolean>;

  // Weight log operations
  createWeightLog(log: InsertWeightLog): Promise<WeightLog>;
  getUserWeightLogs(userId: string, limit?: number, cutoffDate?: Date): Promise<WeightLog[]>;
  getLatestWeightLog(userId: string): Promise<WeightLog | undefined>;

  // Body measurement operations
  createBodyMeasurement(measurement: InsertBodyMeasurement): Promise<BodyMeasurement>;
  getUserBodyMeasurements(userId: string, limit?: number): Promise<BodyMeasurement[]>;

  // Achievement operations
  getAllAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  grantAchievement(userId: string, achievementId: string): Promise<UserAchievement>;

  // Streak operations
  getUserStreaks(userId: string): Promise<DailyStreak[]>;
  updateStreak(userId: string, streakType: string, increment: boolean): Promise<DailyStreak>;

  // Goal operations
  getUserGoals(userId: string): Promise<UserGoal[]>;
  createUserGoal(goal: Omit<UserGoal, 'id' | 'createdAt'>): Promise<UserGoal>;
  updateUserGoal(id: string, data: Partial<UserGoal>): Promise<UserGoal>;

  // Dashboard data
  getDashboardData(userId: string): Promise<{
    todaysCalories: number;
    weeklyWeightChange: number;
    currentStreak: number;
    upcomingMedication: Medication | null;
  }>;

  // Dose escalation operations
  createDoseEscalation(escalation: InsertDoseEscalation): Promise<DoseEscalation>;
  getMedicationDoseHistory(medicationId: string): Promise<DoseEscalation[]>;

  // Hunger log operations
  createHungerLog(log: InsertHungerLog): Promise<HungerLog>;
  getUserHungerLogs(userId: string, limit?: number, cutoffDate?: Date): Promise<HungerLog[]>;

  // Food database operations
  searchFoodByBarcode(barcode: string): Promise<FoodDatabase | undefined>;
  searchFoodByName(query: string, limit?: number): Promise<FoodDatabase[]>;
  addFoodToDatabase(food: InsertFoodDatabase): Promise<FoodDatabase>;

  // Gamification operations
  getUserGamification(userId: string): Promise<UserGamification | undefined>;
  initializeUserGamification(userId: string): Promise<UserGamification>;
  addPoints(userId: string, points: number, reason: string, description?: string): Promise<void>;
  getUserPointTransactions(userId: string, limit?: number): Promise<PointTransaction[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<boolean>;

  // Push subscription operations
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string, userId: string): Promise<boolean>;

  // Recipe operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  getUserRecipes(userId: string): Promise<Recipe[]>;
  getPublicRecipes(limit?: number, filters?: { isGlp1Friendly?: boolean; isHighProtein?: boolean; isLowCarb?: boolean }): Promise<Recipe[]>;
  updateRecipe(id: string, userId: string, data: Partial<Recipe>): Promise<Recipe | null>;
  deleteRecipe(id: string, userId: string): Promise<boolean>;
  searchRecipes(query: string, filters?: { isGlp1Friendly?: boolean; isHighProtein?: boolean; isLowCarb?: boolean }): Promise<Recipe[]>;
  toggleRecipeFavorite(userId: string, recipeId: string): Promise<void>;
  getUserFavoriteRecipes(userId: string): Promise<Recipe[]>;

  // Meal plan operations
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getUserMealPlans(userId: string): Promise<MealPlan[]>;
  getActiveMealPlan(userId: string): Promise<MealPlan | undefined>;
  getMealPlanById(id: string, userId: string): Promise<MealPlan | undefined>;
  updateMealPlan(id: string, userId: string, data: Partial<MealPlan>): Promise<MealPlan | null>;
  deleteMealPlan(id: string, userId: string): Promise<boolean>;

  // Meal plan entry operations
  createMealPlanEntry(entry: InsertMealPlanEntry): Promise<MealPlanEntry>;
  getMealPlanEntries(mealPlanId: string): Promise<MealPlanEntry[]>;
  getMealPlanEntriesByDate(mealPlanId: string, date: Date): Promise<MealPlanEntry[]>;
  getMealPlanEntryWithOwnership(id: string, userId: string): Promise<MealPlanEntry | undefined>;
  updateMealPlanEntry(id: string, userId: string, data: Partial<MealPlanEntry>): Promise<MealPlanEntry | null>;
  deleteMealPlanEntry(id: string, userId: string): Promise<boolean>;

  // Meal prep operations
  createMealPrepSchedule(schedule: InsertMealPrepSchedule): Promise<MealPrepSchedule>;
  getUserMealPrepSchedules(userId: string): Promise<MealPrepSchedule[]>;
  updateMealPrepSchedule(id: string, userId: string, data: Partial<MealPrepSchedule>): Promise<MealPrepSchedule | null>;
  deleteMealPrepSchedule(id: string, userId: string): Promise<boolean>;

  // Nutritional recommendation operations
  getUserRecommendations(userId: string): Promise<NutritionalRecommendation[]>;
  createRecommendation(recommendation: InsertNutritionalRecommendation): Promise<NutritionalRecommendation>;
  updateRecommendation(id: string, data: Partial<NutritionalRecommendation>): Promise<NutritionalRecommendation>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Medication operations
  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [result] = await db.insert(medications).values(medication).returning();
    return result;
  }

  async getUserMedications(userId: string): Promise<Medication[]> {
    return await db.select().from(medications).where(eq(medications.userId, userId));
  }

  async updateMedication(id: string, userId: string, data: Partial<Medication>): Promise<Medication | null> {
    const [result] = await db
      .update(medications)
      .set(data)
      .where(and(eq(medications.id, id), eq(medications.userId, userId)))
      .returning();
    return result || null;
  }

  async deleteMedication(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(medications).where(and(eq(medications.id, id), eq(medications.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Medication log operations
  async createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog> {
    const [result] = await db.insert(medicationLogs).values(log).returning();
    return result;
  }

  async getUserMedicationLogs(userId: string, limit = 50, cutoffDate?: Date): Promise<MedicationLog[]> {
    const conditions = [eq(medicationLogs.userId, userId)];

    // Apply history retention filter at database level if cutoff provided
    if (cutoffDate) {
      conditions.push(gte(medicationLogs.takenAt, cutoffDate));
    }

    return await db
      .select()
      .from(medicationLogs)
      .where(and(...conditions))
      .orderBy(desc(medicationLogs.takenAt))
      .limit(limit);
  }

  async getMedicationLogsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MedicationLog[]> {
    return await db
      .select()
      .from(medicationLogs)
      .where(
        and(
          eq(medicationLogs.userId, userId),
          gte(medicationLogs.takenAt, startDate),
          lte(medicationLogs.takenAt, endDate)
        )
      )
      .orderBy(desc(medicationLogs.takenAt));
  }

  // Food entry operations
  async createFoodEntry(entry: InsertFoodEntry): Promise<FoodEntry> {
    const [result] = await db.insert(foodEntries).values(entry).returning();
    return result;
  }

  async getUserFoodEntries(userId: string, date?: Date, cutoffDate?: Date): Promise<FoodEntry[]> {
    const conditions = [eq(foodEntries.userId, userId)];

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(gte(foodEntries.consumedAt, startOfDay));
      conditions.push(lte(foodEntries.consumedAt, endOfDay));
    }

    // Apply history retention filter at database level if cutoff provided
    if (cutoffDate) {
      conditions.push(gte(foodEntries.consumedAt, cutoffDate));
    }

    return await db
      .select()
      .from(foodEntries)
      .where(and(...conditions))
      .orderBy(desc(foodEntries.consumedAt));
  }

  async getFoodEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<FoodEntry[]> {
    return await db
      .select()
      .from(foodEntries)
      .where(
        and(
          eq(foodEntries.userId, userId),
          gte(foodEntries.consumedAt, startDate),
          lte(foodEntries.consumedAt, endDate)
        )
      )
      .orderBy(desc(foodEntries.consumedAt));
  }

  async updateFoodEntry(id: string, userId: string, data: Partial<FoodEntry>): Promise<FoodEntry | null> {
    const [result] = await db
      .update(foodEntries)
      .set(data)
      .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)))
      .returning();
    return result || null;
  }

  async deleteFoodEntry(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(foodEntries).where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Weight log operations
  async createWeightLog(log: InsertWeightLog): Promise<WeightLog> {
    const [result] = await db.insert(weightLogs).values(log).returning();
    return result;
  }

  async getUserWeightLogs(userId: string, limit = 30, cutoffDate?: Date): Promise<WeightLog[]> {
    const conditions = [eq(weightLogs.userId, userId)];

    // Apply history retention filter at database level if cutoff provided
    if (cutoffDate) {
      conditions.push(gte(weightLogs.loggedAt, cutoffDate));
    }

    return await db
      .select()
      .from(weightLogs)
      .where(and(...conditions))
      .orderBy(desc(weightLogs.loggedAt))
      .limit(limit);
  }

  async getLatestWeightLog(userId: string): Promise<WeightLog | undefined> {
    const [result] = await db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(desc(weightLogs.loggedAt))
      .limit(1);
    return result;
  }

  // Body measurement operations
  async createBodyMeasurement(measurement: InsertBodyMeasurement): Promise<BodyMeasurement> {
    const [result] = await db.insert(bodyMeasurements).values(measurement).returning();
    return result;
  }

  async getUserBodyMeasurements(userId: string, limit = 20): Promise<BodyMeasurement[]> {
    return await db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId))
      .orderBy(desc(bodyMeasurements.measuredAt))
      .limit(limit);
  }

  // Achievement operations
  async getAllAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
  }

  async grantAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    const [result] = await db
      .insert(userAchievements)
      .values({
        userId,
        achievementId,
        earnedAt: new Date(),
      })
      .returning();
    return result;
  }

  // Streak operations
  async getUserStreaks(userId: string): Promise<DailyStreak[]> {
    return await db.select().from(dailyStreaks).where(eq(dailyStreaks.userId, userId));
  }

  async updateStreak(userId: string, streakType: string, increment: boolean): Promise<DailyStreak> {
    const [existing] = await db
      .select()
      .from(dailyStreaks)
      .where(
        and(
          eq(dailyStreaks.userId, userId),
          eq(dailyStreaks.streakType, streakType)
        )
      );

    const today = new Date().toISOString().split('T')[0];
    
    if (!existing) {
      const [result] = await db
        .insert(dailyStreaks)
        .values({
          userId,
          streakType,
          currentStreak: increment ? 1 : 0,
          longestStreak: increment ? 1 : 0,
          lastActivity: today,
        })
        .returning();
      return result;
    }

    const newCurrentStreak = increment ? existing.currentStreak + 1 : 0;
    const newLongestStreak = Math.max(existing.longestStreak, newCurrentStreak);

    const [result] = await db
      .update(dailyStreaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivity: today,
        updatedAt: new Date(),
      })
      .where(eq(dailyStreaks.id, existing.id))
      .returning();
    return result;
  }

  // Goal operations
  async getUserGoals(userId: string): Promise<UserGoal[]> {
    return await db
      .select()
      .from(userGoals)
      .where(and(eq(userGoals.userId, userId), eq(userGoals.isActive, true)));
  }

  async createUserGoal(goal: Omit<UserGoal, 'id' | 'createdAt'>): Promise<UserGoal> {
    const [result] = await db.insert(userGoals).values(goal).returning();
    return result;
  }

  async updateUserGoal(id: string, data: Partial<UserGoal>): Promise<UserGoal> {
    const [result] = await db
      .update(userGoals)
      .set(data)
      .where(eq(userGoals.id, id))
      .returning();
    return result;
  }

  // Dashboard data
  async getDashboardData(userId: string): Promise<{
    todaysCalories: number;
    weeklyWeightChange: number;
    currentStreak: number;
    upcomingMedication: Medication | null;
  }> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Run all queries in parallel to avoid N+1 problem
    const [todaysFood, recentWeights, streakResult, medicationResult] = await Promise.all([
      // Today's calories
      db.select()
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.userId, userId),
            gte(foodEntries.consumedAt, startOfDay),
            lte(foodEntries.consumedAt, endOfDay)
          )
        ),
      // Weekly weight change
      db.select()
        .from(weightLogs)
        .where(
          and(
            eq(weightLogs.userId, userId),
            gte(weightLogs.loggedAt, weekAgo)
          )
        )
        .orderBy(desc(weightLogs.loggedAt))
        .limit(2),
      // Current streak
      db.select()
        .from(dailyStreaks)
        .where(
          and(
            eq(dailyStreaks.userId, userId),
            eq(dailyStreaks.streakType, 'food_tracking')
          )
        )
        .limit(1),
      // Upcoming medication
      db.select()
        .from(medications)
        .where(eq(medications.userId, userId))
        .orderBy(medications.nextDueDate)
        .limit(1),
    ]);

    const todaysCalories = todaysFood.reduce((sum, entry) => sum + entry.calories, 0);

    let weeklyWeightChange = 0;
    if (recentWeights.length >= 2) {
      weeklyWeightChange = Number(recentWeights[0].weight) - Number(recentWeights[1].weight);
    }

    const currentStreak = streakResult[0]?.currentStreak || 0;

    return {
      todaysCalories,
      weeklyWeightChange,
      currentStreak,
      upcomingMedication: medicationResult[0] || null,
    };
  }

  // Dose escalation operations
  async createDoseEscalation(escalation: InsertDoseEscalation): Promise<DoseEscalation> {
    const [result] = await db.insert(doseEscalations).values(escalation).returning();
    return result;
  }

  async getMedicationDoseHistory(medicationId: string): Promise<DoseEscalation[]> {
    return await db
      .select()
      .from(doseEscalations)
      .where(eq(doseEscalations.medicationId, medicationId))
      .orderBy(desc(doseEscalations.escalationDate));
  }

  // Hunger log operations
  async createHungerLog(log: InsertHungerLog): Promise<HungerLog> {
    const [result] = await db.insert(hungerLogs).values(log).returning();
    return result;
  }

  async getUserHungerLogs(userId: string, limit: number = 30, cutoffDate?: Date): Promise<HungerLog[]> {
    const conditions = [eq(hungerLogs.userId, userId)];

    // Apply history retention filter at database level if cutoff provided
    if (cutoffDate) {
      conditions.push(gte(hungerLogs.loggedAt, cutoffDate));
    }

    return await db
      .select()
      .from(hungerLogs)
      .where(and(...conditions))
      .orderBy(desc(hungerLogs.loggedAt))
      .limit(limit);
  }

  // Food database operations
  async searchFoodByBarcode(barcode: string): Promise<FoodDatabase | undefined> {
    const [result] = await db
      .select()
      .from(foodDatabase)
      .where(eq(foodDatabase.barcode, barcode));
    return result;
  }

  async searchFoodByName(query: string, limit: number = 20): Promise<FoodDatabase[]> {
    return await db
      .select()
      .from(foodDatabase)
      .where(sql`${foodDatabase.productName} ILIKE ${'%' + query + '%'}`)
      .limit(limit);
  }

  async addFoodToDatabase(food: InsertFoodDatabase): Promise<FoodDatabase> {
    const [result] = await db.insert(foodDatabase).values(food).returning();
    return result;
  }

  // Gamification operations
  async getUserGamification(userId: string): Promise<UserGamification | undefined> {
    const [result] = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId));
    return result;
  }

  async initializeUserGamification(userId: string): Promise<UserGamification> {
    const [result] = await db
      .insert(userGamification)
      .values({
        userId,
        totalPoints: 0,
        currentLevel: 1,
        levelProgress: 0,
        lifetimePoints: 0,
      })
      .returning();
    return result;
  }

  async addPoints(userId: string, points: number, reason: string, description?: string): Promise<void> {
    // Check if user gamification exists, create if not
    let gamification = await this.getUserGamification(userId);
    if (!gamification) {
      gamification = await this.initializeUserGamification(userId);
    }

    // Calculate level progression (100 points per level)
    const currentPoints = gamification.totalPoints || 0;
    const currentLifetimePoints = gamification.lifetimePoints || 0;
    const newTotalPoints = currentPoints + points;
    const newLevel = Math.floor(newTotalPoints / 100) + 1;
    const levelProgress = (newTotalPoints % 100);

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Update gamification record
      await tx
        .update(userGamification)
        .set({
          totalPoints: newTotalPoints,
          currentLevel: newLevel,
          levelProgress,
          lifetimePoints: currentLifetimePoints + points,
          updatedAt: new Date(),
        })
        .where(eq(userGamification.userId, userId));

      // Log the transaction
      await tx.insert(pointTransactions).values({
        userId,
        points,
        reason,
        description,
      });
    });
  }

  async getUserPointTransactions(userId: string, limit: number = 50): Promise<PointTransaction[]> {
    return await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(limit);
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [result] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    return result;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  // Push subscription operations
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [result] = await db
      .insert(pushSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          userAgent: subscription.userAgent,
        },
      })
      .returning();
    return result;
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  // Recipe operations
  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [result] = await db.insert(recipes).values(recipe).returning();
    return result;
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    return await db
      .select()
      .from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt));
  }

  async getPublicRecipes(limit: number = 50, filters?: any): Promise<Recipe[]> {
    const conditions = [eq(recipes.isPublic, true)];
    
    if (filters?.isGlp1Friendly) {
      conditions.push(eq(recipes.isGlp1Friendly, true));
    }
    if (filters?.isHighProtein) {
      conditions.push(eq(recipes.isHighProtein, true));
    }
    if (filters?.isLowCarb) {
      conditions.push(eq(recipes.isLowCarb, true));
    }
    
    return await db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.likes))
      .limit(limit);
  }

  async updateRecipe(id: string, userId: string, data: Partial<Recipe>): Promise<Recipe | null> {
    const [result] = await db
      .update(recipes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning();
    return result || null;
  }

  async deleteRecipe(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async searchRecipes(query: string, filters?: any): Promise<Recipe[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.isPublic, true),
          sql`LOWER(${recipes.name}) LIKE ${searchTerm} OR LOWER(${recipes.description}) LIKE ${searchTerm}`
        )
      )
      .limit(50);
  }

  async toggleRecipeFavorite(userId: string, recipeId: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(recipeFavorites)
      .where(
        and(
          eq(recipeFavorites.userId, userId),
          eq(recipeFavorites.recipeId, recipeId)
        )
      );

    if (existing) {
      await db
        .delete(recipeFavorites)
        .where(
          and(
            eq(recipeFavorites.userId, userId),
            eq(recipeFavorites.recipeId, recipeId)
          )
        );
    } else {
      await db.insert(recipeFavorites).values({ userId, recipeId });
    }
  }

  async getUserFavoriteRecipes(userId: string): Promise<Recipe[]> {
    return await db
      .select({
        id: recipes.id,
        userId: recipes.userId,
        name: recipes.name,
        description: recipes.description,
        recipeType: recipes.recipeType,
        difficulty: recipes.difficulty,
        prepTime: recipes.prepTime,
        cookTime: recipes.cookTime,
        servings: recipes.servings,
        imageUrl: recipes.imageUrl,
        ingredients: recipes.ingredients,
        instructions: recipes.instructions,
        calories: recipes.calories,
        protein: recipes.protein,
        carbs: recipes.carbs,
        fat: recipes.fat,
        fiber: recipes.fiber,
        sugar: recipes.sugar,
        sodium: recipes.sodium,
        isGlp1Friendly: recipes.isGlp1Friendly,
        isHighProtein: recipes.isHighProtein,
        isLowCarb: recipes.isLowCarb,
        isPublic: recipes.isPublic,
        likes: recipes.likes,
        tags: recipes.tags,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
      })
      .from(recipeFavorites)
      .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(eq(recipeFavorites.userId, userId));
  }

  // Meal plan operations
  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    const [result] = await db.insert(mealPlans).values(mealPlan).returning();
    return result;
  }

  async getUserMealPlans(userId: string): Promise<MealPlan[]> {
    return await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.userId, userId))
      .orderBy(desc(mealPlans.createdAt));
  }

  async getActiveMealPlan(userId: string): Promise<MealPlan | undefined> {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, userId),
          eq(mealPlans.isActive, true)
        )
      )
      .limit(1);
    return plan;
  }

  async getMealPlanById(id: string, userId: string): Promise<MealPlan | undefined> {
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
      .limit(1);
    return plan;
  }

  async updateMealPlan(id: string, userId: string, data: Partial<MealPlan>): Promise<MealPlan | null> {
    const [result] = await db
      .update(mealPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
      .returning();
    return result || null;
  }

  async deleteMealPlan(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(mealPlans).where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Meal plan entry operations
  async createMealPlanEntry(entry: InsertMealPlanEntry): Promise<MealPlanEntry> {
    const [result] = await db.insert(mealPlanEntries).values(entry).returning();
    return result;
  }

  async getMealPlanEntries(mealPlanId: string): Promise<MealPlanEntry[]> {
    return await db
      .select()
      .from(mealPlanEntries)
      .where(eq(mealPlanEntries.mealPlanId, mealPlanId))
      .orderBy(mealPlanEntries.date);
  }

  async getMealPlanEntriesByDate(mealPlanId: string, date: Date): Promise<MealPlanEntry[]> {
    return await db
      .select()
      .from(mealPlanEntries)
      .where(
        and(
          eq(mealPlanEntries.mealPlanId, mealPlanId),
          eq(mealPlanEntries.date, date.toISOString().split('T')[0])
        )
      );
  }

  async getMealPlanEntryWithOwnership(id: string, userId: string): Promise<MealPlanEntry | undefined> {
    // Get the entry and verify the meal plan belongs to the user
    const [result] = await db
      .select({ entry: mealPlanEntries })
      .from(mealPlanEntries)
      .innerJoin(mealPlans, eq(mealPlanEntries.mealPlanId, mealPlans.id))
      .where(and(eq(mealPlanEntries.id, id), eq(mealPlans.userId, userId)))
      .limit(1);
    return result?.entry;
  }

  async updateMealPlanEntry(id: string, userId: string, data: Partial<MealPlanEntry>): Promise<MealPlanEntry | null> {
    // First verify ownership via meal plan
    const existingEntry = await this.getMealPlanEntryWithOwnership(id, userId);
    if (!existingEntry) {
      return null;
    }
    const [result] = await db
      .update(mealPlanEntries)
      .set(data)
      .where(eq(mealPlanEntries.id, id))
      .returning();
    return result || null;
  }

  async deleteMealPlanEntry(id: string, userId: string): Promise<boolean> {
    // First verify ownership via meal plan
    const existingEntry = await this.getMealPlanEntryWithOwnership(id, userId);
    if (!existingEntry) {
      return false;
    }
    await db.delete(mealPlanEntries).where(eq(mealPlanEntries.id, id));
    return true;
  }

  // Meal prep operations
  async createMealPrepSchedule(schedule: InsertMealPrepSchedule): Promise<MealPrepSchedule> {
    const [result] = await db.insert(mealPrepSchedules).values(schedule).returning();
    return result;
  }

  async getUserMealPrepSchedules(userId: string): Promise<MealPrepSchedule[]> {
    return await db
      .select()
      .from(mealPrepSchedules)
      .where(eq(mealPrepSchedules.userId, userId))
      .orderBy(mealPrepSchedules.prepDate);
  }

  async updateMealPrepSchedule(id: string, userId: string, data: Partial<MealPrepSchedule>): Promise<MealPrepSchedule | null> {
    const [result] = await db
      .update(mealPrepSchedules)
      .set(data)
      .where(and(eq(mealPrepSchedules.id, id), eq(mealPrepSchedules.userId, userId)))
      .returning();
    return result || null;
  }

  async deleteMealPrepSchedule(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(mealPrepSchedules).where(and(eq(mealPrepSchedules.id, id), eq(mealPrepSchedules.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Nutritional recommendation operations
  async getUserRecommendations(userId: string): Promise<NutritionalRecommendation[]> {
    return await db
      .select()
      .from(nutritionalRecommendations)
      .where(
        and(
          eq(nutritionalRecommendations.userId, userId),
          eq(nutritionalRecommendations.isActive, true)
        )
      )
      .orderBy(desc(nutritionalRecommendations.createdAt));
  }

  async createRecommendation(recommendation: InsertNutritionalRecommendation): Promise<NutritionalRecommendation> {
    const [result] = await db.insert(nutritionalRecommendations).values(recommendation).returning();
    return result;
  }

  async updateRecommendation(id: string, data: Partial<NutritionalRecommendation>): Promise<NutritionalRecommendation> {
    const [result] = await db
      .update(nutritionalRecommendations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nutritionalRecommendations.id, id))
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
