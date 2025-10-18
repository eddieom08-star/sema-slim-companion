# Using Clerk Development Keys on Production URLs

## Problem

You're getting "Authentication Error" and 401 Unauthorized errors when using Clerk development keys on your production deployment (Vercel/Render).

**This is because Clerk development instances only allow specific domains by default (like localhost).**

## Solution: Configure Development Instance for Production URLs

You can continue using **development keys for testing** by adding your production URLs to the allowed domains in your Clerk development instance.

---

## Step-by-Step Fix

### 1. Access Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Sign in to your account
3. **Select your DEVELOPMENT instance** (the one with keys starting with `pk_test_...`)

### 2. Add Production URLs to Allowed Domains

#### Option A: Via "Domains" Section

1. In the left sidebar, click **"Domains"** (or **"Settings"** → **"Domains"**)
2. Look for section called **"Development origin"** or **"Allowed origins"**
3. Click **"Add domain"** or **"Add origin"**
4. Add these URLs one by one:
   ```
   https://sema-slim-companion.vercel.app
   https://sema-slim-companion.onrender.com
   ```
5. Click **"Save"** or **"Add"**

#### Option B: Via "Paths" Section

1. In the left sidebar, click **"Paths"** (under Redirects)
2. Update the following redirect URLs:

   **After sign-in URL:**
   ```
   https://sema-slim-companion.vercel.app/
   ```

   **After sign-up URL:**
   ```
   https://sema-slim-companion.vercel.app/
   ```

   **After sign-out URL:**
   ```
   https://sema-slim-companion.vercel.app/
   ```

3. Click **"Save"**

### 3. Configure CORS Settings

1. In Clerk dashboard, look for **"JWT Templates"** or **"API Keys"** section
2. Find **"Allowed origins"** or **"CORS settings"**
3. Add:
   ```
   https://sema-slim-companion.vercel.app
   https://sema-slim-companion.onrender.com
   ```
4. Save changes

### 4. Wait for Changes to Propagate

- Clerk configuration changes can take **1-3 minutes** to propagate
- No need to redeploy your application
- Just wait a few minutes after saving

### 5. Clear Browser Cache and Test

1. Open your browser DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab → **Storage** → **Clear site data**
3. Or manually delete cookies for `sema-slim-companion.vercel.app`
4. Refresh the page: https://sema-slim-companion.vercel.app
5. Click **"Try Again"** or **"Sign In"**
6. Authentication should now work!

---

## Troubleshooting

### Still Getting 401 Errors?

**Check Clerk Dashboard Settings:**

1. Go to Clerk Dashboard → Your Development Instance
2. Click **"Settings"** in sidebar
3. Look for **"Instance Settings"** or **"Application Settings"**
4. Verify these settings:

   ✅ **Instance type:** Development
   ✅ **Allowed domains:** Includes your Vercel and Render URLs
   ✅ **Sign-in URL:** Points to your production URL
   ✅ **Sign-up URL:** Points to your production URL

### Error: "Invalid publishable key"

**Cause:** Frontend and backend keys don't match

**Fix:**
1. Verify `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` are identical
2. Both should match your Clerk publishable key from the dashboard (format: `pk_test_...`)
3. Check both Vercel and Render environment variables

### Error: "Cross-origin request blocked"

**Cause:** CORS not configured properly

**Fix:**
1. In Clerk Dashboard → Development Instance → Settings
2. Add your production URLs to allowed origins
3. Save and wait 2-3 minutes
4. Clear browser cache and try again

---

## Alternative: Create Separate Development Instance

If you want to keep your current setup for local development:

### Create a Second Development Instance

1. Go to Clerk Dashboard
2. Click **"Create Application"**
3. Name it: `SemaSlim - Vercel Testing`
4. Select **Development** instance
5. Configure with your Vercel/Render URLs
6. Get the new keys (`pk_test_...` and `sk_test_...`)
7. Update Vercel and Render environment variables with these new keys

This way you can:
- Keep original development instance for local testing (localhost)
- Use second development instance for production URL testing (Vercel/Render)
- Eventually upgrade second instance to production when ready

---

## When to Upgrade to Production Keys

You should upgrade to production keys (`pk_live_...`) when:

✅ You're ready to launch to real users
✅ You've finished testing all features
✅ You expect more than the free tier limits
✅ You want production-grade support and SLA

**But for now, you can continue testing with development keys!**

---

## Quick Checklist

- [ ] Go to Clerk Dashboard
- [ ] Select DEVELOPMENT instance (pk_test_...)
- [ ] Add production URLs to allowed domains:
  - `https://sema-slim-companion.vercel.app`
  - `https://sema-slim-companion.onrender.com`
- [ ] Save and wait 2-3 minutes
- [ ] Clear browser cookies
- [ ] Test authentication - should work now!

---

## What This Allows

After configuring your development instance:

✅ Test authentication on production URLs (Vercel/Render)
✅ Use development keys without limits
✅ No need to upgrade to paid plan yet
✅ Full authentication functionality
✅ No more 401 errors

**Note:** Development instances have usage limits, but they're usually sufficient for testing and small-scale deployments.

---

## Screenshots Guide

### Where to Find Settings in Clerk Dashboard

**Step 1: Select Development Instance**
```
Dashboard → [Your App Name] → (Make sure it says "Development" instance)
```

**Step 2: Add Domains**
```
Left Sidebar → "Domains" → "Add domain" button
OR
Left Sidebar → "Settings" → "Domains" section
```

**Step 3: Configure Redirects**
```
Left Sidebar → "Paths" → Update all URLs to your production URL
```

---

## Need Help?

If you're still having issues after following these steps:

1. **Check Clerk Console Warnings:**
   - Open browser DevTools → Console tab
   - Look for red error messages
   - Share any Clerk-specific errors

2. **Verify Environment Variables:**
   ```bash
   # Check Vercel
   vercel env ls

   # Check Render
   # (via dashboard → Environment tab)
   ```

3. **Check Network Tab:**
   - DevTools → Network tab
   - Look for failed requests to `/api/auth/user`
   - Check the response status and error message

---

**Expected Result After Fix:**

✅ No more 401 errors
✅ No "Authentication Error" message
✅ Successfully redirected to dashboard after sign-in
✅ Console shows: "Clerk initialized successfully"
✅ Can test authentication with development keys on production URLs

---

**Last Updated:** October 12, 2025
**Status:** Development keys can work on production URLs with proper configuration
