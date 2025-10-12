# Vercel Environment Variables Setup

## Critical: Your app is failing because environment variables are missing on Vercel

### **Step 1: Go to Vercel Dashboard**

1. Open: https://vercel.com/dashboard
2. Click on your `sema-slim-companion` project
3. Click **Settings** tab
4. Click **Environment Variables** in the sidebar

### **Step 2: Add These Variables**

Add each variable with these values (from your .env file):

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `DATABASE_URL` | Copy from your `.env` file | Production, Preview, Development |
| `CLERK_PUBLISHABLE_KEY` | Copy from your `.env` file | Production, Preview, Development |
| `CLERK_SECRET_KEY` | Copy from your `.env` file | Production, Preview, Development |
| `VITE_CLERK_PUBLISHABLE_KEY` | Copy from your `.env` file | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | Copy from your `.env` file | Production, Preview, Development |
| `SESSION_SECRET` | Copy from your `.env` file | Production, Preview, Development |
| `NODE_ENV` | `production` | Production only |

### **Step 3: For Each Variable:**

1. Click **Add New**
2. Enter the **Name** (e.g., `DATABASE_URL`)
3. Enter the **Value** (copy from table above)
4. Select environments: ✅ Production, ✅ Preview, ✅ Development
5. Click **Save**
6. Repeat for all 7 variables

### **Step 4: Redeploy**

After adding all variables:

1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes

### **Step 5: Verify**

After deployment completes:

```bash
# Test the health endpoint
curl https://sema-slim-companion.vercel.app/api/health

# Test auth endpoint (should now work with Clerk session)
# Visit your app in browser and sign in - /api/auth/user should work
```

---

## Why This Is Needed

Vercel serverless functions don't have access to your local `.env` file. Environment variables must be configured in the Vercel dashboard for each deployment environment.

## Security Note

**WARNING:** The credentials shown here are from your development environment. For production:

1. ✅ **Use production Clerk keys** (not test keys starting with `pk_test_` and `sk_test_`)
2. ✅ **Use a separate production database** (not your development database)
3. ✅ **Generate a new SESSION_SECRET** for production

### To Get Production Clerk Keys:

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **API Keys** section
4. Copy the **Production** keys (they start with `pk_live_` and `sk_live_`)
5. Update Vercel environment variables with production keys

---

## Troubleshooting

### Still seeing 500 errors?

1. Check Vercel Function Logs:
   - Go to **Deployments** → Click latest deployment → **Function Logs**
   - Look for error messages about missing env vars

2. Verify all variables are saved:
   - Go to **Settings** → **Environment Variables**
   - Confirm all 7 variables are listed

3. Clear build cache and redeploy:
   - **Deployments** → (...) → **Redeploy** → Check "Clear Build Cache"

### Database Connection Issues?

Test your DATABASE_URL locally:
```bash
psql "postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require"
```

If this fails, you may need to:
1. Check your Neon dashboard for the correct connection string
2. Ensure your Neon database is not paused (free tier databases auto-pause)
3. Whitelist Vercel IPs in Neon (if using IP restrictions)

---

## Quick Copy-Paste for Vercel CLI

If you prefer using the CLI:

```bash
# Add each environment variable from your .env file
vercel env add DATABASE_URL production
vercel env add CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add VITE_CLERK_PUBLISHABLE_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add SESSION_SECRET production
vercel env add NODE_ENV production

# Then redeploy
vercel --prod
```

**Tip:** Copy the values from your `.env` file when prompted.

---

## Once Fixed

After adding environment variables and redeploying:

✅ `/api/auth/user` will return user data (not 500)
✅ Clerk authentication will work
✅ Database queries will succeed
✅ Your app will be functional

**Estimated time to fix: 5-10 minutes**
