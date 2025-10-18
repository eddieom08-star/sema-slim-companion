# Clerk 401 Debug Steps

## Current Issue
Getting 401 Unauthorized on `/api/auth/user` endpoint.

**Root Cause:** `auth.userId` is null in the server middleware, meaning Clerk doesn't see a valid session.

---

## Debug Checklist

### 1. Check If You're Signed In

**In the browser at https://sema-slim-companion.vercel.app:**

❓ What do you see in the top-right corner?
- [ ] "Sign In" button → You're NOT signed in (this is why you get 401)
- [ ] Your profile picture/name → You ARE signed in (domain config issue)

**If you see "Sign In" button:**
- Click it
- Sign in with your credentials
- After signing in, the app should redirect to dashboard
- Check if 401 errors stop

### 2. Check Clerk Session Cookies

**Open DevTools (F12) → Application → Cookies:**

Look for these cookies under `https://sema-slim-companion.vercel.app`:
- [ ] `__session` - Contains Clerk session token
- [ ] `__clerk_db_jwt` - Contains Clerk JWT
- [ ] `__client_uat` - Client update timestamp

**If these cookies are missing:** Clerk isn't setting session cookies (domain not configured)

### 3. Check Clerk Console Warnings

**Open DevTools (F12) → Console:**

Look for Clerk-specific messages:
```
✅ Good: "Clerk initialized successfully"
⚠️ Warning: "Clerk has been loaded with development keys"
❌ Error: "Invalid publishable key" or "Domain not allowed"
```

Copy any error messages you see.

### 4. Verify Clerk Domain Configuration

**Go to Clerk Dashboard (https://dashboard.clerk.com):**

#### A. Check Instance Type
- [ ] You're in the DEVELOPMENT instance (not production)
- [ ] Keys start with `pk_test_...` and `sk_test_...`

#### B. Check Allowed Domains

**Navigate to: Settings → Domains (or just "Domains" in sidebar)**

You should see:
```
✅ https://sema-slim-companion.vercel.app
✅ https://sema-slim-companion.onrender.com
✅ http://localhost:3000 (for local dev)
```

**If your production URLs are NOT listed:** This is the problem!

#### C. Check Redirect URLs

**Navigate to: Settings → Paths**

Verify these are set:
```
Sign-in redirect: https://sema-slim-companion.vercel.app/
Sign-up redirect: https://sema-slim-companion.vercel.app/
After sign-out: https://sema-slim-companion.vercel.app/
```

### 5. Check Environment Variables

**In Vercel Dashboard (https://vercel.com/dashboard):**

Go to: Project → Settings → Environment Variables

Verify:
```bash
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Note:** Replace the `xxxxxxxx` placeholders with your actual keys from the Clerk Dashboard.

**If these don't match your Clerk dashboard:** Update them and redeploy.

---

## Most Likely Cause

Based on the error pattern, **you probably haven't configured the Clerk allowed domains yet.**

### Quick Fix Steps:

1. **Go to Clerk Dashboard:** https://dashboard.clerk.com
2. **Select Development Instance** (the one with `pk_test_...` keys)
3. **Add Your URL:**
   - Click "Domains" or "Settings" → "Domains"
   - Click "Add domain" or "Add origin"
   - Enter: `https://sema-slim-companion.vercel.app`
   - Click Save
4. **Wait 2-3 Minutes** (for DNS/config propagation)
5. **Clear Browser Data:**
   - DevTools → Application → Clear site data
   - Or use Incognito window
6. **Try Again:**
   - Go to https://sema-slim-companion.vercel.app
   - Click "Sign In"
   - Complete sign-in flow
   - Should redirect to dashboard without errors

---

## Expected Behavior After Fix

### In Browser Console:
```
✅ Clerk initialized successfully
✅ Signed in as user_xxx
✅ GET /api/auth/user 200 (OK)
```

### In Network Tab:
```
Request: GET /api/auth/user
Status: 200 OK
Response: { "id": "user_xxx", "email": "...", ... }
```

### In UI:
```
✅ Redirected to dashboard after sign-in
✅ See your profile picture in navigation
✅ Dashboard loads with your data
```

---

## If Still Not Working

### Check Server Logs (Vercel)

1. Go to Vercel Dashboard → Your Project → Logs
2. Look for authentication logs:
   ```
   [INFO] Auth request received | hasAuthUserId: false
   [WARN] Auth check failed: no userId
   ```

This confirms Clerk isn't recognizing the session.

### Try These Additional Steps:

1. **Use a different browser** (or Incognito mode)
2. **Disable browser extensions** temporarily
3. **Check if your domain is blocked** by corporate firewall/VPN
4. **Wait longer** - Sometimes Clerk config takes 5-10 minutes to propagate

### Get More Details:

Check what Clerk is actually receiving:

**In Browser Console, run:**
```javascript
// Check Clerk state
window.Clerk.session
window.Clerk.user
```

**If both return null:** You're not signed in or domain isn't configured

---

## What's Happening Behind the Scenes

### The Authentication Flow:

1. **User clicks "Sign In"**
2. Clerk modal opens
3. User enters credentials
4. Clerk validates with Clerk servers
5. **Clerk checks:** "Is sema-slim-companion.vercel.app in allowed domains?"
   - ✅ Yes → Sets session cookies and redirects
   - ❌ No → Returns error or doesn't set cookies
6. Browser redirects to app with session cookies
7. Frontend makes request to `/api/auth/user`
8. Backend checks for `auth.userId` from Clerk
   - ✅ Found → Returns user data (200)
   - ❌ Not found → Returns 401 Unauthorized

**Your error is at step 5 or 8** - Clerk isn't setting proper session or isn't recognizing it.

---

## Screenshots to Share (If Still Having Issues)

Please share screenshots of:

1. **Clerk Dashboard → Domains section**
   - Shows what domains are configured

2. **Browser DevTools → Application → Cookies**
   - Shows what cookies are set

3. **Browser DevTools → Console**
   - Shows Clerk initialization messages and errors

4. **Browser UI**
   - Shows if you're signed in or not (top-right corner)

This will help me diagnose the exact issue.

---

## Quick Decision Tree

```
Are you signed in (see profile picture)?
├─ NO → Click "Sign In" and sign in first
│   └─ Does sign-in work?
│       ├─ YES → Check if 401 errors stop
│       └─ NO → Domain not configured in Clerk
│
└─ YES (signed in but still getting 401)
    └─ Domain configured in Clerk?
        ├─ NO → Add domain to Clerk and wait 2-3 min
        ├─ YES but just added → Wait 5-10 min for propagation
        └─ YES and waited → Check environment variables match
```

---

**Next Step:** Please tell me what you see when you look at the top-right corner of https://sema-slim-companion.vercel.app

Do you see:
- A) "Sign In" button (not signed in)
- B) Your profile picture/name (signed in)

This will tell us which path to take.
