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
  updateMedication(id: string, data: Partial<Medication>): Promise<Medication>;
  deleteMedication(id: string): Promise<void>;

  // Medication log operations
  createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog>;
  getUserMedicationLogs(userId: string, limit?: number): Promise<MedicationLog[]>;
  getMedicationLogsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MedicationLog[]>;

  // Food entry operations
  createFoodEntry(entry: InsertFoodEntry): Promise<FoodEntry>;
  getUserFoodEntries(userId: string, date?: Date): Promise<FoodEntry[]>;
  getFoodEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<FoodEntry[]>;
  updateFoodEntry(id: string, data: Partial<FoodEntry>): Promise<FoodEntry>;
  deleteFoodEntry(id: string): Promise<void>;

  // Weight log operations
  createWeightLog(log: InsertWeightLog): Promise<WeightLog>;
  getUserWeightLogs(userId: string, limit?: number): Promise<WeightLog[]>;
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

  async updateMedication(id: string, data: Partial<Medication>): Promise<Medication> {
    const [result] = await db
      .update(medications)
      .set(data)
      .where(eq(medications.id, id))
      .returning();
    return result;
  }

  async deleteMedication(id: string): Promise<void> {
    await db.delete(medications).where(eq(medications.id, id));
  }

  // Medication log operations
  async createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog> {
    const [result] = await db.insert(medicationLogs).values(log).returning();
    return result;
  }

  async getUserMedicationLogs(userId: string, limit = 50): Promise<MedicationLog[]> {
    return await db
      .select()
      .from(medicationLogs)
      .where(eq(medicationLogs.userId, userId))
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

  async getUserFoodEntries(userId: string, date?: Date): Promise<FoodEntry[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db
        .select()
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.userId, userId),
            gte(foodEntries.consumedAt, startOfDay),
            lte(foodEntries.consumedAt, endOfDay)
          )
        )
        .orderBy(desc(foodEntries.consumedAt));
    }
    
    return await db
      .select()
      .from(foodEntries)
      .where(eq(foodEntries.userId, userId))
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

  async updateFoodEntry(id: string, data: Partial<FoodEntry>): Promise<FoodEntry> {
    const [result] = await db
      .update(foodEntries)
      .set(data)
      .where(eq(foodEntries.id, id))
      .returning();
    return result;
  }

  async deleteFoodEntry(id: string): Promise<void> {
    await db.delete(foodEntries).where(eq(foodEntries.id, id));
  }

  // Weight log operations
  async createWeightLog(log: InsertWeightLog): Promise<WeightLog> {
    const [result] = await db.insert(weightLogs).values(log).returning();
    return result;
  }

  async getUserWeightLogs(userId: string, limit = 30): Promise<WeightLog[]> {
    return await db
      .select()
      .from(weightLogs)
      .where(eq(weightLogs.userId, userId))
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

    // Today's calories
    const todaysFood = await db
      .select()
      .from(foodEntries)
      .where(
        and(
          eq(foodEntries.userId, userId),
          gte(foodEntries.consumedAt, startOfDay),
          lte(foodEntries.consumedAt, endOfDay)
        )
      );

    const todaysCalories = todaysFood.reduce((sum, entry) => sum + entry.calories, 0);

    // Weekly weight change
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentWeights = await db
      .select()
      .from(weightLogs)
      .where(
        and(
          eq(weightLogs.userId, userId),
          gte(weightLogs.loggedAt, weekAgo)
        )
      )
      .orderBy(desc(weightLogs.loggedAt))
      .limit(2);

    let weeklyWeightChange = 0;
    if (recentWeights.length >= 2) {
      weeklyWeightChange = Number(recentWeights[0].weight) - Number(recentWeights[1].weight);
    }

    // Current streak
    const [streak] = await db
      .select()
      .from(dailyStreaks)
      .where(
        and(
          eq(dailyStreaks.userId, userId),
          eq(dailyStreaks.streakType, 'food_tracking')
        )
      );

    const currentStreak = streak?.currentStreak || 0;

    // Upcoming medication
    const [upcomingMedication] = await db
      .select()
      .from(medications)
      .where(eq(medications.userId, userId))
      .orderBy(medications.nextDueDate)
      .limit(1);

    return {
      todaysCalories,
      weeklyWeightChange,
      currentStreak,
      upcomingMedication: upcomingMedication || null,
    };
  }
}

export const storage = new DatabaseStorage();
