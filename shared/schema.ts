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
  adherenceScore: integer("adherence_score").default(100), // 0-100 percentage
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
  nausea: integer("nausea"), // 0-5 scale
  vomiting: integer("vomiting"), // 0-5 scale
  diarrhea: integer("diarrhea"), // 0-5 scale
  constipation: integer("constipation"), // 0-5 scale
  heartburn: integer("heartburn"), // 0-5 scale
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

// Dose escalation tracking
export const doseEscalations = pgTable("dose_escalations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").notNull().references(() => medications.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  previousDose: varchar("previous_dose", { length: 10 }).notNull(),
  newDose: varchar("new_dose", { length: 10 }).notNull(),
  escalationDate: date("escalation_date").notNull(),
  reason: text("reason"),
  prescribedBy: varchar("prescribed_by", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Hunger and satiety tracking
export const hungerLogs = pgTable("hunger_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  foodEntryId: varchar("food_entry_id").references(() => foodEntries.id),
  hungerBefore: integer("hunger_before").notNull(), // 1-10 scale
  hungerAfter: integer("hunger_after"), // 1-10 scale
  fullnessDuration: integer("fullness_duration"), // hours feeling full
  cravingIntensity: integer("craving_intensity"), // 1-10 scale
  cravingType: varchar("craving_type", { length: 50 }), // sweet, salty, savory
  loggedAt: timestamp("logged_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Food database for barcode scanning
export const foodDatabase = pgTable("food_database", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barcode: varchar("barcode", { length: 50 }).notNull().unique(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  servingSize: decimal("serving_size", { precision: 8, scale: 3 }).notNull(),
  servingUnit: varchar("serving_unit", { length: 20 }).notNull(),
  calories: integer("calories").notNull(),
  protein: decimal("protein", { precision: 8, scale: 3 }).notNull(),
  carbs: decimal("carbs", { precision: 8, scale: 3 }).notNull(),
  fat: decimal("fat", { precision: 8, scale: 3 }).notNull(),
  fiber: decimal("fiber", { precision: 8, scale: 3 }),
  sugar: decimal("sugar", { precision: 8, scale: 3 }),
  sodium: decimal("sodium", { precision: 8, scale: 3 }),
  region: varchar("region", { length: 5 }), // US, UK, EU
  source: varchar("source", { length: 50 }), // openfoodfacts, usda, user_contributed
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gamification: User points and levels
export const userGamification = pgTable("user_gamification", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  totalPoints: integer("total_points").default(0),
  currentLevel: integer("current_level").default(1),
  levelProgress: integer("level_progress").default(0), // percentage to next level
  lifetimePoints: integer("lifetime_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Point transactions log
export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(), // streak_bonus, meal_logged, weight_milestone
  description: text("description"),
  multiplier: decimal("multiplier", { precision: 3, scale: 2 }).default('1.0'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 30 }).notNull(), // medication_reminder, achievement, streak, goal, weight_milestone
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url", { length: 255 }),
  relatedId: varchar("related_id"), // id of related entity (achievement_id, medication_id, etc)
  createdAt: timestamp("created_at").defaultNow(),
});

// Push subscriptions for Web Push API
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipes
export const recipeTypeEnum = pgEnum("recipe_type", ["breakfast", "lunch", "dinner", "snack", "dessert"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for system/admin recipes
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  recipeType: recipeTypeEnum("recipe_type").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  servings: integer("servings").notNull().default(1),
  imageUrl: varchar("image_url", { length: 500 }),
  ingredients: jsonb("ingredients").notNull(), // [{name, quantity, unit}]
  instructions: text("instructions").notNull(),
  calories: integer("calories").notNull(),
  protein: decimal("protein", { precision: 8, scale: 3 }).notNull(),
  carbs: decimal("carbs", { precision: 8, scale: 3 }).notNull(),
  fat: decimal("fat", { precision: 8, scale: 3 }).notNull(),
  fiber: decimal("fiber", { precision: 8, scale: 3 }),
  sugar: decimal("sugar", { precision: 8, scale: 3 }),
  sodium: decimal("sodium", { precision: 8, scale: 3 }),
  isGlp1Friendly: boolean("is_glp1_friendly").default(true),
  isHighProtein: boolean("is_high_protein").default(false),
  isLowCarb: boolean("is_low_carb").default(false),
  isPublic: boolean("is_public").default(false), // whether visible to other users
  likes: integer("likes").default(0),
  tags: text("tags").array(), // ["keto", "vegetarian", "quick", etc]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipe favorites
export const recipeFavorites = pgTable("recipe_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal plans
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetCalories: integer("target_calories"),
  targetProtein: decimal("target_protein", { precision: 8, scale: 3 }),
  targetCarbs: decimal("target_carbs", { precision: 8, scale: 3 }),
  targetFat: decimal("target_fat", { precision: 8, scale: 3 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meal plan entries (scheduled meals)
export const mealTypeEnum = pgEnum("meal_type_enum", ["breakfast", "lunch", "dinner", "snack"]);

export const mealPlanEntries = pgTable("meal_plan_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mealPlanId: varchar("meal_plan_id").notNull().references(() => mealPlans.id),
  recipeId: varchar("recipe_id").references(() => recipes.id),
  date: date("date").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  servings: decimal("servings", { precision: 3, scale: 1 }).notNull().default('1.0'),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal prep schedules
export const mealPrepSchedules = pgTable("meal_prep_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id),
  prepDate: date("prep_date").notNull(),
  prepTime: timestamp("prep_time"),
  servingsPrepped: integer("servings_prepped").notNull(),
  storageInstructions: text("storage_instructions"),
  expiryDate: date("expiry_date"),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nutritional recommendations
export const nutritionalRecommendations = pgTable("nutritional_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recommendationType: varchar("recommendation_type", { length: 50 }).notNull(), // daily_calories, protein_target, meal_timing, etc
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  targetValue: decimal("target_value", { precision: 8, scale: 3 }),
  unit: varchar("unit", { length: 20 }),
  priority: varchar("priority", { length: 20 }).notNull(), // high, medium, low
  basedOnMedicationType: varchar("based_on_medication_type", { length: 20 }), // ozempic, mounjaro, etc
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export type InsertDoseEscalation = typeof doseEscalations.$inferInsert;
export type DoseEscalation = typeof doseEscalations.$inferSelect;

export type InsertHungerLog = typeof hungerLogs.$inferInsert;
export type HungerLog = typeof hungerLogs.$inferSelect;

export type InsertFoodDatabase = typeof foodDatabase.$inferInsert;
export type FoodDatabase = typeof foodDatabase.$inferSelect;

export type InsertUserGamification = typeof userGamification.$inferInsert;
export type UserGamification = typeof userGamification.$inferSelect;

export type InsertPointTransaction = typeof pointTransactions.$inferInsert;
export type PointTransaction = typeof pointTransactions.$inferSelect;

export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertRecipe = typeof recipes.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;

export type InsertRecipeFavorite = typeof recipeFavorites.$inferInsert;
export type RecipeFavorite = typeof recipeFavorites.$inferSelect;

export type InsertMealPlan = typeof mealPlans.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertMealPlanEntry = typeof mealPlanEntries.$inferInsert;
export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;

export type InsertMealPrepSchedule = typeof mealPrepSchedules.$inferInsert;
export type MealPrepSchedule = typeof mealPrepSchedules.$inferSelect;

export type InsertNutritionalRecommendation = typeof nutritionalRecommendations.$inferInsert;
export type NutritionalRecommendation = typeof nutritionalRecommendations.$inferSelect;

// Zod schemas for validation
export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
}).extend({
  nextDueDate: z.coerce.date(),
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  takenAt: z.coerce.date(),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  consumedAt: z.coerce.date(),
});

export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  loggedAt: z.coerce.date(),
});

export const insertBodyMeasurementSchema = createInsertSchema(bodyMeasurements).omit({
  id: true,
  createdAt: true,
}).extend({
  measuredAt: z.coerce.date(),
});

export const insertDoseEscalationSchema = createInsertSchema(doseEscalations).omit({
  id: true,
  createdAt: true,
});

export const insertHungerLogSchema = createInsertSchema(hungerLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  hungerBefore: z.number().min(1).max(10),
  hungerAfter: z.number().min(1).max(10).nullable().optional(),
  cravingIntensity: z.number().min(1).max(10).nullable().optional(),
  loggedAt: z.coerce.date(),
});

export const insertFoodDatabaseSchema = createInsertSchema(foodDatabase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPointTransactionSchema = createInsertSchema(pointTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
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

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likes: true,
});

export const insertRecipeFavoriteSchema = createInsertSchema(recipeFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMealPlanEntrySchema = createInsertSchema(mealPlanEntries).omit({
  id: true,
  createdAt: true,
});

export const insertMealPrepScheduleSchema = createInsertSchema(mealPrepSchedules).omit({
  id: true,
  createdAt: true,
});

export const insertNutritionalRecommendationSchema = createInsertSchema(nutritionalRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================
// MONETIZATION TABLES
// ============================================

// Subscription tier enum
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "pro"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "past_due", "trialing"]);
export const billingPeriodEnum = pgEnum("billing_period", ["monthly", "annual"]);

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),

  // Subscription details
  tier: subscriptionTierEnum("tier").notNull().default("free"),
  billingPeriod: billingPeriodEnum("billing_period"),
  status: subscriptionStatusEnum("status").notNull().default("active"),

  // Trial dates
  trialStartDate: timestamp("trial_start_date"),
  trialEndDate: timestamp("trial_end_date"),

  // Billing period dates
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),

  // Stripe integration
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),

  // RevenueCat integration (mobile)
  revenuecatCustomerId: varchar("revenuecat_customer_id", { length: 255 }),
  revenuecatEntitlementId: varchar("revenuecat_entitlement_id", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscriptions_stripe_customer").on(table.stripeCustomerId),
  index("idx_subscriptions_status").on(table.status),
]);

// Token balances table
export const tokenBalances = pgTable("token_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),

  // Token types
  aiTokens: integer("ai_tokens").notNull().default(0),
  exportTokens: integer("export_tokens").notNull().default(0),
  streakShields: integer("streak_shields").notNull().default(0),

  // Monthly allowances tracking (for Pro users)
  aiTokensMonthlyUsed: integer("ai_tokens_monthly_used").notNull().default(0),
  exportsMonthlyUsed: integer("exports_monthly_used").notNull().default(0),
  streakShieldsMonthlyUsed: integer("streak_shields_monthly_used").notNull().default(0),
  monthlyResetDate: date("monthly_reset_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Token type enum
export const tokenTypeEnum = pgEnum("token_type", ["ai_tokens", "export_tokens", "streak_shields"]);
export const tokenSourceEnum = pgEnum("token_source", ["purchase", "subscription", "reward", "usage", "refund"]);

// Token transactions table
export const tokenTransactions = pgTable("token_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),

  // Transaction details
  tokenType: tokenTypeEnum("token_type").notNull(),
  amount: integer("amount").notNull(), // positive = credit, negative = debit
  balanceAfter: integer("balance_after").notNull(),

  // Source tracking
  source: tokenSourceEnum("source").notNull(),
  sourceReference: varchar("source_reference", { length: 255 }), // order ID, achievement ID, etc.

  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_token_transactions_user_id").on(table.userId),
  index("idx_token_transactions_created_at").on(table.createdAt),
]);

// Purchase status enum
export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "refunded", "failed"]);
export const productTypeEnum = pgEnum("product_type", ["token_pack", "cosmetic", "subscription"]);

// Purchases table
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),

  // Purchase details
  productType: productTypeEnum("product_type").notNull(),
  productId: varchar("product_id", { length: 100 }).notNull(), // e.g., 'ai_tokens_5', 'theme_dark_pro'
  quantity: integer("quantity").notNull().default(1),

  // Pricing
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),

  // Status
  status: purchaseStatusEnum("status").notNull().default("pending"),

  // Payment provider details
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  appleTransactionId: varchar("apple_transaction_id", { length: 255 }),
  googleOrderId: varchar("google_order_id", { length: 255 }),

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_purchases_user_id").on(table.userId),
  index("idx_purchases_status").on(table.status),
  index("idx_purchases_stripe_payment").on(table.stripePaymentIntentId),
]);

// Cosmetic category enum
export const cosmeticCategoryEnum = pgEnum("cosmetic_category", ["avatar_frame", "theme", "badge", "streak_flame"]);

// Cosmetic items table
export const cosmeticItems = pgTable("cosmetic_items", {
  id: varchar("id", { length: 100 }).primaryKey(), // e.g., 'avatar_frame_gold', 'theme_midnight'

  // Item details
  category: cosmeticCategoryEnum("category").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),

  // Availability
  priceCents: integer("price_cents"), // null = not purchasable (earned only)
  proExclusive: boolean("pro_exclusive").notNull().default(false),
  earnable: boolean("earnable").notNull().default(false), // can be earned through achievements
  earnableAchievementId: varchar("earnable_achievement_id").references(() => achievements.id),

  // Display
  previewUrl: varchar("preview_url", { length: 500 }),
  assetData: jsonb("asset_data"), // colors, images, etc.

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_cosmetic_items_category").on(table.category),
]);

// Cosmetic acquisition enum
export const cosmeticAcquisitionEnum = pgEnum("cosmetic_acquisition", ["purchase", "achievement", "default", "gift", "pro_benefit"]);

// User cosmetics table
export const userCosmetics = pgTable("user_cosmetics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  cosmeticId: varchar("cosmetic_id", { length: 100 }).notNull().references(() => cosmeticItems.id),

  // Acquisition
  acquiredVia: cosmeticAcquisitionEnum("acquired_via").notNull(),
  purchaseId: varchar("purchase_id").references(() => purchases.id),

  // Status
  isEquipped: boolean("is_equipped").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_cosmetics_user_id").on(table.userId),
]);

// Upsell action enum
export const upsellActionEnum = pgEnum("upsell_action", ["shown", "clicked", "dismissed", "converted"]);

// Upsell events table (analytics)
export const upsellEvents = pgTable("upsell_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),

  // Event details
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'ai_limit', 'history_limit', 'streak_risk', etc.
  upsellType: varchar("upsell_type", { length: 30 }).notNull(), // 'pro_subscription', 'token_pack', 'trial'
  placement: varchar("placement", { length: 50 }).notNull(), // 'modal', 'inline', 'notification', 'banner'

  // Response
  action: upsellActionEnum("action"),

  // Context
  contextData: jsonb("context_data"), // relevant state (streak length, feature used, etc.)

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_upsell_events_user_id").on(table.userId),
  index("idx_upsell_events_trigger").on(table.triggerType),
  index("idx_upsell_events_action").on(table.action),
  index("idx_upsell_events_created_at").on(table.createdAt),
]);

// Feature usage tracking (for daily/monthly limits)
export const featureUsage = pgTable("feature_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),

  // Usage tracking
  featureType: varchar("feature_type", { length: 50 }).notNull(), // 'barcode_scan', 'ai_meal_plan', 'ai_recipe'
  usageDate: date("usage_date").notNull(),
  usageCount: integer("usage_count").notNull().default(1),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feature_usage_user_date").on(table.userId, table.usageDate),
  index("idx_feature_usage_type").on(table.featureType),
]);

// ============================================
// MONETIZATION TYPE EXPORTS
// ============================================

export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertTokenBalance = typeof tokenBalances.$inferInsert;
export type TokenBalance = typeof tokenBalances.$inferSelect;

export type InsertTokenTransaction = typeof tokenTransactions.$inferInsert;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;

export type InsertPurchase = typeof purchases.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;

export type InsertCosmeticItem = typeof cosmeticItems.$inferInsert;
export type CosmeticItem = typeof cosmeticItems.$inferSelect;

export type InsertUserCosmetic = typeof userCosmetics.$inferInsert;
export type UserCosmetic = typeof userCosmetics.$inferSelect;

export type InsertUpsellEvent = typeof upsellEvents.$inferInsert;
export type UpsellEvent = typeof upsellEvents.$inferSelect;

export type InsertFeatureUsage = typeof featureUsage.$inferInsert;
export type FeatureUsage = typeof featureUsage.$inferSelect;

// ============================================
// MONETIZATION ZOD SCHEMAS
// ============================================

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTokenBalanceSchema = createInsertSchema(tokenBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertCosmeticItemSchema = createInsertSchema(cosmeticItems).omit({
  createdAt: true,
});

export const insertUserCosmeticSchema = createInsertSchema(userCosmetics).omit({
  id: true,
  createdAt: true,
});

export const insertUpsellEventSchema = createInsertSchema(upsellEvents).omit({
  id: true,
  createdAt: true,
});

export const insertFeatureUsageSchema = createInsertSchema(featureUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
