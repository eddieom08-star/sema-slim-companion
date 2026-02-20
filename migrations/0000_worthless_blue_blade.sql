CREATE TYPE "public"."billing_period" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."cosmetic_acquisition" AS ENUM('purchase', 'achievement', 'default', 'gift', 'pro_benefit');--> statement-breakpoint
CREATE TYPE "public"."cosmetic_category" AS ENUM('avatar_frame', 'theme', 'badge', 'streak_flame');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."meal_type_enum" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('token_pack', 'cosmetic', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'completed', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."recipe_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack', 'dessert');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."token_source" AS ENUM('purchase', 'subscription', 'reward', 'usage', 'refund');--> statement-breakpoint
CREATE TYPE "public"."token_type" AS ENUM('ai_tokens', 'export_tokens', 'streak_shields');--> statement-breakpoint
CREATE TYPE "public"."upsell_action" AS ENUM('shown', 'clicked', 'dismissed', 'converted');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(50) NOT NULL,
	"type" varchar(20) NOT NULL,
	"requirement" integer NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"waist" numeric(5, 2),
	"chest" numeric(5, 2),
	"hips" numeric(5, 2),
	"thigh" numeric(5, 2),
	"arm" numeric(5, 2),
	"neck" numeric(5, 2),
	"measured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cosmetic_items" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"category" "cosmetic_category" NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price_cents" integer,
	"pro_exclusive" boolean DEFAULT false NOT NULL,
	"earnable" boolean DEFAULT false NOT NULL,
	"earnable_achievement_id" varchar,
	"preview_url" varchar(500),
	"asset_data" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_streaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"streak_type" varchar(20) NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dose_escalations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"previous_dose" varchar(10) NOT NULL,
	"new_dose" varchar(10) NOT NULL,
	"escalation_date" date NOT NULL,
	"reason" text,
	"prescribed_by" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"feature_type" varchar(50) NOT NULL,
	"usage_date" date NOT NULL,
	"usage_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "food_database" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barcode" varchar(50) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"serving_size" numeric(8, 3) NOT NULL,
	"serving_unit" varchar(20) NOT NULL,
	"calories" integer NOT NULL,
	"protein" numeric(8, 3) NOT NULL,
	"carbs" numeric(8, 3) NOT NULL,
	"fat" numeric(8, 3) NOT NULL,
	"fiber" numeric(8, 3),
	"sugar" numeric(8, 3),
	"sodium" numeric(8, 3),
	"region" varchar(5),
	"source" varchar(50),
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "food_database_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"food_name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"barcode" varchar(50),
	"quantity" numeric(8, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"calories" integer NOT NULL,
	"protein" numeric(8, 3) NOT NULL,
	"carbs" numeric(8, 3) NOT NULL,
	"fat" numeric(8, 3) NOT NULL,
	"fiber" numeric(8, 3),
	"sugar" numeric(8, 3),
	"sodium" numeric(8, 3),
	"meal_type" varchar(20) NOT NULL,
	"consumed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hunger_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"food_entry_id" varchar,
	"hunger_before" integer NOT NULL,
	"hunger_after" integer,
	"fullness_duration" integer,
	"craving_intensity" integer,
	"craving_type" varchar(50),
	"logged_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_plan_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_plan_id" varchar NOT NULL,
	"recipe_id" varchar,
	"date" date NOT NULL,
	"meal_type" "meal_type_enum" NOT NULL,
	"servings" numeric(3, 1) DEFAULT '1.0' NOT NULL,
	"notes" text,
	"completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"target_calories" integer,
	"target_protein" numeric(8, 3),
	"target_carbs" numeric(8, 3),
	"target_fat" numeric(8, 3),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_prep_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"recipe_id" varchar NOT NULL,
	"prep_date" date NOT NULL,
	"prep_time" timestamp,
	"servings_prepped" integer NOT NULL,
	"storage_instructions" text,
	"expiry_date" date,
	"completed" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"taken_at" timestamp NOT NULL,
	"dosage" varchar(10) NOT NULL,
	"notes" text,
	"nausea" integer,
	"vomiting" integer,
	"diarrhea" integer,
	"constipation" integer,
	"heartburn" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"medication_type" varchar(20) NOT NULL,
	"dosage" varchar(10) NOT NULL,
	"frequency" varchar(20) NOT NULL,
	"start_date" date NOT NULL,
	"next_due_date" timestamp NOT NULL,
	"reminder_enabled" boolean DEFAULT true,
	"adherence_score" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"action_url" varchar(255),
	"related_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nutritional_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"recommendation_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"target_value" numeric(8, 3),
	"unit" varchar(20),
	"priority" varchar(20) NOT NULL,
	"based_on_medication_type" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"points" integer NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"multiplier" numeric(3, 2) DEFAULT '1.0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"product_type" "product_type" NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"apple_transaction_id" varchar(255),
	"google_order_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "recipe_favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"recipe_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"recipe_type" "recipe_type" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"servings" integer DEFAULT 1 NOT NULL,
	"image_url" varchar(500),
	"ingredients" jsonb NOT NULL,
	"instructions" text NOT NULL,
	"calories" integer NOT NULL,
	"protein" numeric(8, 3) NOT NULL,
	"carbs" numeric(8, 3) NOT NULL,
	"fat" numeric(8, 3) NOT NULL,
	"fiber" numeric(8, 3),
	"sugar" numeric(8, 3),
	"sodium" numeric(8, 3),
	"is_glp1_friendly" boolean DEFAULT true,
	"is_high_protein" boolean DEFAULT false,
	"is_low_carb" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"likes" integer DEFAULT 0,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"billing_period" "billing_period",
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"trial_start_date" timestamp,
	"trial_end_date" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"revenuecat_customer_id" varchar(255),
	"revenuecat_entitlement_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "token_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"ai_tokens" integer DEFAULT 0 NOT NULL,
	"export_tokens" integer DEFAULT 0 NOT NULL,
	"streak_shields" integer DEFAULT 0 NOT NULL,
	"ai_tokens_monthly_used" integer DEFAULT 0 NOT NULL,
	"exports_monthly_used" integer DEFAULT 0 NOT NULL,
	"streak_shields_monthly_used" integer DEFAULT 0 NOT NULL,
	"monthly_reset_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "token_balances_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "token_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token_type" "token_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"source" "token_source" NOT NULL,
	"source_reference" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "upsell_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"trigger_type" varchar(50) NOT NULL,
	"upsell_type" varchar(30) NOT NULL,
	"placement" varchar(50) NOT NULL,
	"action" "upsell_action",
	"context_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"earned_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_cosmetics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"cosmetic_id" varchar(100) NOT NULL,
	"acquired_via" "cosmetic_acquisition" NOT NULL,
	"purchase_id" varchar,
	"is_equipped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_gamification" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"total_points" integer DEFAULT 0,
	"current_level" integer DEFAULT 1,
	"level_progress" integer DEFAULT 0,
	"lifetime_points" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_gamification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"goal_type" varchar(30) NOT NULL,
	"target_value" numeric(8, 2) NOT NULL,
	"current_value" numeric(8, 2) DEFAULT '0',
	"unit" varchar(20) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"current_weight" numeric(5, 2),
	"target_weight" numeric(5, 2),
	"height" integer,
	"date_of_birth" date,
	"gender" varchar(10),
	"activity_level" varchar(20),
	"medication_type" varchar(20),
	"start_date" date,
	"onboarding_completed" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"body_fat" numeric(5, 2),
	"muscle_mass" numeric(5, 2),
	"notes" text,
	"logged_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cosmetic_items" ADD CONSTRAINT "cosmetic_items_earnable_achievement_id_achievements_id_fk" FOREIGN KEY ("earnable_achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_streaks" ADD CONSTRAINT "daily_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_escalations" ADD CONSTRAINT "dose_escalations_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_escalations" ADD CONSTRAINT "dose_escalations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunger_logs" ADD CONSTRAINT "hunger_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunger_logs" ADD CONSTRAINT "hunger_logs_food_entry_id_food_entries_id_fk" FOREIGN KEY ("food_entry_id") REFERENCES "public"."food_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_meal_plan_id_meal_plans_id_fk" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_schedules" ADD CONSTRAINT "meal_prep_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_prep_schedules" ADD CONSTRAINT "meal_prep_schedules_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutritional_recommendations" ADD CONSTRAINT "nutritional_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_balances" ADD CONSTRAINT "token_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_events" ADD CONSTRAINT "upsell_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmetic_id_cosmetic_items_id_fk" FOREIGN KEY ("cosmetic_id") REFERENCES "public"."cosmetic_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cosmetic_items_category" ON "cosmetic_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_daily_streaks_user_type" ON "daily_streaks" USING btree ("user_id","streak_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_feature_usage_user_date_type" ON "feature_usage" USING btree ("user_id","usage_date","feature_type");--> statement-breakpoint
CREATE INDEX "idx_feature_usage_type" ON "feature_usage" USING btree ("feature_type");--> statement-breakpoint
CREATE INDEX "idx_food_entries_user_id" ON "food_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_food_entries_consumed_at" ON "food_entries" USING btree ("consumed_at");--> statement-breakpoint
CREATE INDEX "idx_food_entries_user_consumed" ON "food_entries" USING btree ("user_id","consumed_at");--> statement-breakpoint
CREATE INDEX "idx_medication_logs_user_id" ON "medication_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_medication_logs_taken_at" ON "medication_logs" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX "idx_medications_user_id" ON "medications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_medications_next_due" ON "medications" USING btree ("next_due_date");--> statement-breakpoint
CREATE INDEX "idx_purchases_user_id" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_status" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_purchases_stripe_payment" ON "purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_stripe_customer" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_token_transactions_user_id" ON "token_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_token_transactions_created_at" ON "token_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_upsell_events_user_id" ON "upsell_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_upsell_events_trigger" ON "upsell_events" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_upsell_events_action" ON "upsell_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_upsell_events_created_at" ON "upsell_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_cosmetics_user_id" ON "user_cosmetics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_weight_logs_user_id" ON "weight_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_weight_logs_logged_at" ON "weight_logs" USING btree ("logged_at");--> statement-breakpoint
CREATE INDEX "idx_weight_logs_user_logged" ON "weight_logs" USING btree ("user_id","logged_at");