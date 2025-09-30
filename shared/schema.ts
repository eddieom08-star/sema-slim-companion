import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // SemaSlim specific fields
  currentWeight: decimal("current_weight", { precision: 5, scale: 2 }),
  targetWeight: decimal("target_weight", { precision: 5, scale: 2 }),
  height: integer("height"), // in cm
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 10 }),
  activityLevel: varchar("activity_level", { length: 20 }),
  medicationType: varchar("medication_type", { length: 20 }), // ozempic, mounjaro, wegovy, rybelsus
  startDate: date("start_date"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

// Medication tracking
export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  medicationType: varchar("medication_type", { length: 20 }).notNull(), // ozempic, mounjaro, wegovy, rybelsus
  dosage: varchar("dosage", { length: 10 }).notNull(), // 0.25mg, 0.5mg, 1mg, 2mg
  frequency: varchar("frequency", { length: 20 }).notNull(), // weekly, daily
  startDate: date("start_date").notNull(),
  nextDueDate: timestamp("next_due_date").notNull(),
  reminderEnabled: boolean("reminder_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medication logs
export const medicationLogs = pgTable("medication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").notNull().references(() => medications.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  takenAt: timestamp("taken_at").notNull(),
  dosage: varchar("dosage", { length: 10 }).notNull(),
  notes: text("notes"),
  sideEffects: text("side_effects"),
  sideEffectSeverity: integer("side_effect_severity"), // 1-10 scale
  createdAt: timestamp("created_at").defaultNow(),
});

// Food entries
export const foodEntries = pgTable("food_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  foodName: varchar("food_name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  barcode: varchar("barcode", { length: 50 }),
  quantity: decimal("quantity", { precision: 8, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(), // grams, cups, pieces, etc
  calories: integer("calories").notNull(),
  protein: decimal("protein", { precision: 8, scale: 3 }).notNull(),
  carbs: decimal("carbs", { precision: 8, scale: 3 }).notNull(),
  fat: decimal("fat", { precision: 8, scale: 3 }).notNull(),
  fiber: decimal("fiber", { precision: 8, scale: 3 }),
  sugar: decimal("sugar", { precision: 8, scale: 3 }),
  sodium: decimal("sodium", { precision: 8, scale: 3 }),
  mealType: varchar("meal_type", { length: 20 }).notNull(), // breakfast, lunch, dinner, snack
  consumedAt: timestamp("consumed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weight logs
export const weightLogs = pgTable("weight_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  bodyFat: decimal("body_fat", { precision: 5, scale: 2 }),
  muscleMass: decimal("muscle_mass", { precision: 5, scale: 2 }),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Body measurements
export const bodyMeasurements = pgTable("body_measurements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  waist: decimal("waist", { precision: 5, scale: 2 }),
  chest: decimal("chest", { precision: 5, scale: 2 }),
  hips: decimal("hips", { precision: 5, scale: 2 }),
  thigh: decimal("thigh", { precision: 5, scale: 2 }),
  arm: decimal("arm", { precision: 5, scale: 2 }),
  neck: decimal("neck", { precision: 5, scale: 2 }),
  measuredAt: timestamp("measured_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievements
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // streak, weight_loss, consistency, milestone
  requirement: integer("requirement").notNull(), // days for streak, lbs for weight loss, etc
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily streaks
export const dailyStreaks = pgTable("daily_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  streakType: varchar("streak_type", { length: 20 }).notNull(), // food_tracking, medication, weight_logging
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivity: date("last_activity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User goals
export const userGoals = pgTable("user_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  goalType: varchar("goal_type", { length: 30 }).notNull(), // weekly_weight_loss, calorie_target, protein_target
  targetValue: decimal("target_value", { precision: 8, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 8, scale: 2 }).default('0'),
  unit: varchar("unit", { length: 20 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertMedication = typeof medications.$inferInsert;
export type Medication = typeof medications.$inferSelect;

export type InsertMedicationLog = typeof medicationLogs.$inferInsert;
export type MedicationLog = typeof medicationLogs.$inferSelect;

export type InsertFoodEntry = typeof foodEntries.$inferInsert;
export type FoodEntry = typeof foodEntries.$inferSelect;

export type InsertWeightLog = typeof weightLogs.$inferInsert;
export type WeightLog = typeof weightLogs.$inferSelect;

export type InsertBodyMeasurement = typeof bodyMeasurements.$inferInsert;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type DailyStreak = typeof dailyStreaks.$inferSelect;
export type UserGoal = typeof userGoals.$inferSelect;

// Zod schemas for validation
export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertFoodEntrySchema = createInsertSchema(foodEntries).omit({
  id: true,
  createdAt: true,
});

export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBodyMeasurementSchema = createInsertSchema(bodyMeasurements).omit({
  id: true,
  createdAt: true,
});

export const updateUserProfileSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  email: true,
}).extend({
  medicationType: z.enum(['ozempic', 'mounjaro', 'wegovy', 'rybelsus']).optional(),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});
