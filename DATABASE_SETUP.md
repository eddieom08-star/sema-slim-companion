# Database Setup Guide

## Current Issue: DATABASE_URL Error

### ❌ CRITICAL ERROR FOUND

Your DATABASE_URL has an incorrect hostname format that will prevent database connections:

**Current (WRONG):**
```
postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require
                                                                           ^^^^^^^^
```

**Corrected (RIGHT):**
```
postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require
                                                                           ^^^^^^^^^
```

**Change:** `us-west2` → `us-west-2` (add hyphen)

---

## Database Schema Overview

Your application uses **Drizzle ORM** with a comprehensive schema for GLP-1 weight management. The database contains **28 tables**:

### Core Tables
1. **sessions** - Session storage for authentication
2. **users** - User profiles with health data
3. **medications** - GLP-1 medication tracking (Ozempic, Mounjaro, Wegovy, Rybelsus)
4. **medication_logs** - Medication intake logs with side effects
5. **dose_escalations** - Dosage increase tracking

### Nutrition & Food Tracking
6. **food_entries** - User food consumption logs
7. **food_database** - Barcode scanning food database
8. **hunger_logs** - Hunger and satiety tracking
9. **recipes** - User and system recipes
10. **recipe_favorites** - Saved recipes
11. **meal_plans** - Weekly meal planning
12. **meal_plan_entries** - Individual meal plan items
13. **meal_prep_schedules** - Meal prep planning
14. **nutritional_recommendations** - AI-generated nutrition advice

### Progress Tracking
15. **weight_logs** - Daily weight measurements
16. **body_measurements** - Body composition tracking (waist, chest, hips, etc.)
17. **daily_streaks** - Activity streaks (food logging, medication, weight)

### Gamification & Goals
18. **achievements** - Available achievements
19. **user_achievements** - Earned achievements
20. **user_gamification** - User points, levels, progress
21. **point_transactions** - Points earned/spent log
22. **user_goals** - Custom user goals

### Notifications
23. **notifications** - In-app notifications
24. **push_subscriptions** - Web Push API subscriptions

---

## Fix Steps for Render Deployment

### Step 1: Update DATABASE_URL in Render

1. Go to https://dashboard.render.com
2. Click on your **semaslim-app** service
3. Go to **Environment** tab
4. Find **DATABASE_URL** variable
5. Click **Edit**
6. Replace the current value with the corrected URL:
   ```
   postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require
   ```
7. Click **Save Changes**

### Step 2: Verify Other Environment Variables

Ensure these are all set in Render:

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3: Push Database Schema

After fixing the DATABASE_URL, you need to create all 28 tables in your Neon database. You can do this in two ways:

#### Option A: Push from Local Machine (Recommended)

1. **Update your local .env file** first:
   ```bash
   # Edit /Users/edoomoniyi/sema-slim-env/sema-slim-companion.env
   # Change us-west2 to us-west-2
   ```

2. **Load environment variables:**
   ```bash
   export $(cat /Users/edoomoniyi/sema-slim-env/sema-slim-companion.env | xargs)
   ```

3. **Push schema to database:**
   ```bash
   npm run db:push
   ```

   This will:
   - Connect to your Neon database
   - Create all 28 tables
   - Set up foreign keys and indexes
   - Apply the complete schema from `shared/schema.ts`

4. **Verify tables were created:**
   - Log in to your Neon dashboard: https://console.neon.tech
   - Go to your project
   - Check the **Tables** section
   - You should see all 28 tables listed

#### Option B: Push from Render (After Deployment Succeeds)

1. Fix DATABASE_URL as described in Step 1
2. Deploy to Render (see Step 4)
3. Once deployed, use Render Shell:
   ```bash
   # In Render dashboard → Service → Shell
   npm run db:push
   ```

### Step 4: Redeploy to Render

After updating the DATABASE_URL:

1. In Render dashboard, click **Manual Deploy**
2. Select **Clear build cache & deploy**
3. Monitor the deploy logs for:
   ```
   Starting server initialization
   Database connected successfully
   Initializing Clerk middleware
   Registering routes...
   Server started successfully on port 10000
   ```

---

## Verification Steps

### 1. Check Database Connection

After deployment, test the connection:
```bash
curl https://your-render-url.onrender.com/api/diagnostics
```

Should return database connection status.

### 2. Verify Tables Exist

**Via Neon Dashboard:**
1. Go to https://console.neon.tech
2. Select your project: `neondb`
3. Go to **Tables** tab
4. Verify all 28 tables are listed:
   - sessions
   - users
   - medications
   - medication_logs
   - food_entries
   - weight_logs
   - body_measurements
   - achievements
   - user_achievements
   - daily_streaks
   - user_goals
   - dose_escalations
   - hunger_logs
   - food_database
   - user_gamification
   - point_transactions
   - notifications
   - push_subscriptions
   - recipes
   - recipe_favorites
   - meal_plans
   - meal_plan_entries
   - meal_prep_schedules
   - nutritional_recommendations

**Via SQL Query:**
```sql
-- Run in Neon SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 3. Test Application Endpoints

```bash
# Health check
curl https://your-render-url.onrender.com/health

# User profile (requires authentication)
curl -H "Authorization: Bearer <token>" \
  https://your-render-url.onrender.com/api/auth/user
```

---

## Database Schema Management

### Understanding Drizzle ORM

Your app uses **Drizzle ORM** instead of traditional SQL migrations:

- **Schema Definition:** `shared/schema.ts` (single source of truth)
- **Push Command:** `npm run db:push` (syncs schema to database)
- **No Migration Files:** Drizzle generates and applies changes automatically

### Making Schema Changes

When you need to modify the database:

1. Edit `shared/schema.ts`
2. Run `npm run db:push`
3. Drizzle will:
   - Detect changes
   - Generate SQL
   - Apply to database
   - Preserve existing data

### Important Notes

- ✅ **Safe:** Drizzle preserves existing data when adding columns
- ⚠️ **Warning:** Drizzle will ask for confirmation on destructive changes (dropping columns/tables)
- 📝 **Best Practice:** Always backup production data before schema changes

---

## Common Database Issues

### Issue 1: "DATABASE_URL must be set"

**Cause:** Environment variable not configured or has wrong format

**Fix:**
1. Check DATABASE_URL in Render environment variables
2. Verify the format matches the corrected URL above
3. Ensure no extra spaces or quotes
4. Redeploy after changes

### Issue 2: "Connection refused" or "ENOTFOUND"

**Cause:** Incorrect hostname in DATABASE_URL

**Fix:** Ensure hostname is `us-west-2` (with hyphen), not `us-west2`

### Issue 3: "SSL connection required"

**Cause:** Missing `?sslmode=require` in DATABASE_URL

**Fix:** Ensure DATABASE_URL ends with `?sslmode=require`

### Issue 4: "Table does not exist"

**Cause:** Database schema not pushed

**Fix:** Run `npm run db:push` to create all tables

### Issue 5: "Authentication failed"

**Cause:** Incorrect database credentials

**Fix:** Verify username and password in DATABASE_URL match your Neon dashboard

---

## Local Development Database

For local development, you can either:

### Option A: Use Neon Database (Recommended)
```bash
# Use the same DATABASE_URL as production
DATABASE_URL="postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require"
```

### Option B: Use Local PostgreSQL
```bash
# Install PostgreSQL locally
brew install postgresql@16  # macOS
# or
sudo apt install postgresql-16  # Linux

# Create local database
createdb semaslim_dev

# Update .env
DATABASE_URL="postgresql://localhost:5432/semaslim_dev"

# Push schema
npm run db:push
```

---

## Troubleshooting Commands

### Check Database Connection
```bash
# From your terminal (with DATABASE_URL set)
psql "$DATABASE_URL" -c "SELECT version();"
```

### List All Tables
```bash
psql "$DATABASE_URL" -c "\\dt"
```

### Check Table Structure
```bash
psql "$DATABASE_URL" -c "\\d users"
```

### Count Users
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## Next Steps

1. ✅ **Update DATABASE_URL** in Render dashboard (fix us-west2 → us-west-2)
2. ✅ **Push schema** using `npm run db:push` (locally or after Render deployment)
3. ✅ **Redeploy** Render service
4. ✅ **Test endpoints** to verify database connection
5. ✅ **Verify tables** exist in Neon dashboard

---

## Summary

**Problem:** DATABASE_URL has incorrect hostname format (`us-west2` instead of `us-west-2`)

**Impact:** Server cannot connect to database, causing Render deployment failure

**Solution:**
1. Fix DATABASE_URL in Render environment variables
2. Run `npm run db:push` to create 28 tables
3. Redeploy to Render
4. Verify connection via `/api/diagnostics`

**Status:** Ready to fix - all steps documented above

---

**Created:** October 12, 2025
**Database:** Neon PostgreSQL
**ORM:** Drizzle
**Tables:** 28
**Schema File:** `shared/schema.ts`
