# Clerk Production Keys Setup Guide

## ⚠️ Critical Issue: Development Keys in Production

Your application is currently using **Clerk development keys** (`pk_test_...`) in production, which is causing:

1. ❌ **401 Unauthorized errors** on `/api/auth/user`
2. ⚠️ **Strict usage limits** (development instances have lower limits)
3. ⚠️ **Not suitable for production** use

### Current Keys (DEVELOPMENT ONLY):
```bash
# Example format - DO NOT use real keys in documentation
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ SECURITY WARNING:** Never commit real API keys to documentation or code. The above are placeholder examples only.

**These keys must be replaced with production keys.**

---

## Solution: Get Clerk Production Keys

### Step 1: Access Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Sign in to your Clerk account
3. Select your application (or create a new production instance)

### Step 2: Create Production Instance (If Needed)

If you only have a development instance:

1. Click **"Create Application"** in Clerk dashboard
2. Choose **Production** instance type
3. Name it: `SemaSlim Production`
4. Select authentication methods:
   - ✅ Email/Password
   - ✅ Email Link (passwordless)
   - ✅ Google OAuth (optional)
   - ✅ Other providers as needed

5. Click **"Create Application"**

### Step 3: Get Production Keys

1. In Clerk dashboard, go to **API Keys** section
2. You should see two tabs:
   - **Development** (current keys starting with `pk_test_`, `sk_test_`)
   - **Production** (new keys starting with `pk_live_`, `sk_live_`)

3. Click the **Production** tab
4. Copy the following keys:

   **Frontend Key (Public):**
   ```
   CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_... (same as above)
   ```

   **Backend Key (Secret - Keep Private!):**
   ```
   CLERK_SECRET_KEY=sk_live_...
   ```

### Step 4: Configure Production Domains

In Clerk dashboard, under **Domains** section:

1. Add your production URLs:
   - `https://sema-slim-companion.vercel.app`
   - `https://sema-slim-companion.onrender.com`

2. Set redirect URLs:
   - **Sign-in redirect:** `https://sema-slim-companion.vercel.app/`
   - **Sign-up redirect:** `https://sema-slim-companion.vercel.app/`
   - **After sign-out:** `https://sema-slim-companion.vercel.app/`

3. Add allowed origins:
   - `https://sema-slim-companion.vercel.app`
   - `https://sema-slim-companion.onrender.com`

### Step 5: Update Environment Variables

#### A. Update Vercel

1. Go to https://vercel.com/dashboard
2. Select your `sema-slim-companion` project
3. Go to **Settings** → **Environment Variables**
4. Update these variables with **production** keys:

   ```bash
   CLERK_PUBLISHABLE_KEY=pk_live_... (your new production key)
   CLERK_SECRET_KEY=sk_live_... (your new production secret)
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_... (same as publishable key)
   ```

5. Select **Production** environment
6. Click **Save**
7. Go to **Deployments** tab
8. Click **Redeploy** on latest deployment

#### B. Update Render

1. Go to https://dashboard.render.com
2. Select your `sema-slim-companion` service
3. Go to **Environment** tab
4. Update these variables with **production** keys:

   ```bash
   CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   ```

5. Click **Save Changes**
6. Click **Manual Deploy** → **Deploy latest commit**

#### C. Update Local Environment File

Update `/Users/edoomoniyi/sema-slim-env/sema-slim-companion.env`:

```bash
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

---

## Verify Production Setup

### 1. Check Clerk Console

After updating keys, check the browser console. You should see:

**Before (WRONG):**
```
Clerk: Clerk has been loaded with development keys...
```

**After (CORRECT):**
```
Clerk: Clerk initialized successfully
```

### 2. Test Authentication Flow

1. Go to https://sema-slim-companion.vercel.app
2. Click **Sign In**
3. Sign in with your credentials
4. You should be redirected to dashboard
5. Check browser console - no more 401 errors

### 3. Test API Endpoints

```bash
# Health check
curl https://sema-slim-companion.vercel.app/api/health

# Diagnostics (verify Clerk keys are set)
curl https://sema-slim-companion.vercel.app/api/diagnostics
```

---

## Troubleshooting

### Issue 1: Still Getting 401 Errors

**Cause:** Old session cookies from development instance

**Fix:**
1. Open browser DevTools
2. Go to **Application** → **Cookies**
3. Delete all cookies for `sema-slim-companion.vercel.app`
4. Refresh page and sign in again

### Issue 2: "Invalid publishable key"

**Cause:** Mismatched keys between frontend and backend

**Fix:**
1. Verify `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` are **identical**
2. Verify both start with `pk_live_`
3. Redeploy after updating

### Issue 3: CORS Errors

**Cause:** Clerk production domain not configured

**Fix:**
1. Go to Clerk dashboard → **Domains**
2. Add `https://sema-slim-companion.vercel.app`
3. Add `https://sema-slim-companion.onrender.com`
4. Save and wait 2-3 minutes for DNS propagation

### Issue 4: "Application not found"

**Cause:** Wrong production instance selected

**Fix:**
1. Verify you're copying keys from the **correct** Clerk application
2. Check the application name in Clerk dashboard
3. Ensure you selected **Production** tab, not Development

---

## Development vs Production Keys

### Development Keys (Current - DO NOT USE IN PRODUCTION)

```bash
✅ Use for: Local development, testing
❌ Don't use for: Production deployments
📊 Limits: Low usage limits, rate limiting
🔑 Format: pk_test_..., sk_test_...
```

### Production Keys (Required for Production)

```bash
✅ Use for: Production deployments (Vercel, Render)
❌ Don't use for: Local development (optional, but not recommended)
📊 Limits: Higher usage limits, production-ready
🔑 Format: pk_live_..., sk_live_...
💰 Cost: May require paid Clerk plan
```

---

## Clerk Pricing (Important!)

⚠️ **Production instances may require a paid Clerk plan.**

**Free Tier Limits:**
- Development instances: Unlimited (for testing only)
- Production instances: Limited free tier (check Clerk dashboard)

**Paid Plans:**
- **Essential:** $25/month - 10,000 MAUs (Monthly Active Users)
- **Pro:** $99/month - 100,000 MAUs
- **Enterprise:** Custom pricing

**Check your current plan:**
1. Go to Clerk dashboard
2. Click **Billing** in sidebar
3. View your current plan and limits

If you exceed free tier limits, you'll need to upgrade to a paid plan.

---

## Alternative: Keep Development Keys (Not Recommended)

If you want to keep using development keys temporarily:

1. **Understand the risks:**
   - ⚠️ Usage limits may be hit quickly
   - ⚠️ Not suitable for real users
   - ⚠️ May cause authentication failures

2. **Update Clerk dashboard:**
   - Go to development instance settings
   - Add production URLs to allowed domains
   - This might help with CORS issues

3. **Plan to upgrade soon** to production keys

---

## Summary Checklist

- [ ] Access Clerk dashboard
- [ ] Create/select production instance
- [ ] Copy production keys (`pk_live_...`, `sk_live_...`)
- [ ] Add production domains to Clerk
- [ ] Update Vercel environment variables
- [ ] Redeploy Vercel
- [ ] Update Render environment variables
- [ ] Redeploy Render
- [ ] Clear browser cookies
- [ ] Test authentication flow
- [ ] Verify no more 401 errors
- [ ] Check Clerk billing/plan limits

---

## Expected Behavior After Fix

### Console (No Errors)
```
✅ Clerk initialized successfully
✅ User authenticated
✅ No 401 errors on /api/auth/user
```

### API Responses
```json
{
  "user": {
    "id": "user_...",
    "email": "user@example.com",
    "firstName": "...",
    "onboardingCompleted": true
  }
}
```

### Clerk Dashboard
```
📊 Production instance active
✅ Users authenticating successfully
📈 Usage metrics visible
```

---

**Next Steps:**
1. Get production keys from Clerk dashboard
2. Update environment variables on Vercel and Render
3. Redeploy both platforms
4. Test authentication flow
5. Verify no more errors

**Need Help?**
- Clerk Documentation: https://clerk.com/docs
- Clerk Support: https://clerk.com/support
- Clerk Discord: https://clerk.com/discord

---

**Last Updated:** October 12, 2025
**Status:** Action Required - Update to Production Keys
