# Render Deployment Troubleshooting Guide

## Quick Diagnosis

### Step 1: Check Render Logs
1. Go to https://dashboard.render.com
2. Click on your `semaslim-app` service
3. Go to the **Logs** tab
4. Look for error messages in:
   - **Build Logs** (shows npm ci and npm run build output)
   - **Deploy Logs** (shows server startup)

### Step 2: Common Issues & Fixes

## Issue 1: Build Failure - Missing Dependencies

**Symptoms:**
```
npm ERR! Could not resolve dependency
npm ERR! peer vite@"^4.0.0 || ^5.0.0" from @vitejs/plugin-react
```

**Cause:** Build tools now in `dependencies` (required for both platforms)

**Fix:** Already fixed in latest code. Just redeploy:
1. In Render dashboard, click **Manual Deploy** → **Clear build cache & deploy**

## Issue 2: Server Start Failure - Missing Environment Variables

**Symptoms:**
```
Error: DATABASE_URL must be set
Error: CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must be set
```

**Cause:** Environment variables not configured in Render

**Fix:**
1. Go to Render dashboard → Your service → **Environment**
2. Verify these variables are set:
   - ✅ `DATABASE_URL` (from your Neon database)
   - ✅ `CLERK_PUBLISHABLE_KEY`
   - ✅ `CLERK_SECRET_KEY`
   - ✅ `VITE_CLERK_PUBLISHABLE_KEY`
   - ✅ `ANTHROPIC_API_KEY`
   - ✅ `NODE_ENV` = `production`
   - ✅ `PORT` = `10000`

**Note:** Check the correct DATABASE_URL from your earlier file:
```
postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require
```
(Note: `us-west-2` with hyphen, not `us-west2`)

## Issue 3: Rollup Platform Binary Error

**Symptoms:**
```
Error: Cannot find module @rollup/rollup-linux-x64-gnu
```

**Cause:** Vite/Rollup trying to load in production (should not happen with current fix)

**Status:** ✅ Already fixed in server/index.ts with lazy dynamic imports

**Verify Fix:**
```bash
# Check if rollup is in the bundle (should be empty)
grep -i "rollup" dist/index.js
```

## Issue 4: Server Not Listening

**Symptoms:**
```
Server failed to start
Health check failed
```

**Cause:** Server code might be detecting wrong environment

**Check:** In logs, look for:
```
Running in serverless mode - skipping server.listen()
```

**If you see this:** The server thinks it's in serverless mode (wrong!)

**Fix:** Verify environment variables:
- `VERCEL` should NOT be set on Render
- `AWS_LAMBDA_FUNCTION_NAME` should NOT be set on Render

## Issue 5: Static Files Not Found

**Symptoms:**
```
Error: Could not find the build directory: .../public
```

**Cause:** Build didn't create dist/public directory

**Fix:**
1. Check build logs for `vite build` errors
2. Ensure `vite build` completes before esbuild runs
3. Verify dist/public directory exists in build output

## Current Configuration

### render.yaml
```yaml
buildCommand: npm ci && npm run build
startCommand: npm start
```

### package.json scripts
```json
{
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js"
}
```

### Expected Build Output
```
dist/
├── index.js          # Server bundle (from server/index.ts)
└── public/           # Frontend assets (from vite build)
    ├── index.html
    ├── assets/
    │   ├── index-*.js
    │   └── index-*.css
    └── icons/
```

## Debugging Steps

### 1. Check Build Success
In Render logs, look for:
```
✓ built in X.XXs
  dist/index.js  XXX.Xkb
⚡ Done in XXms
```

### 2. Check Server Start
Look for these log messages:
```
Starting server initialization
Initializing Clerk middleware
Registering routes...
Routes registered successfully
Server started successfully on port 10000
serving on port 10000
```

### 3. Test Endpoints
Once deployed, test:
```bash
# Health check
curl https://your-render-url.onrender.com/health

# Diagnostics
curl https://your-render-url.onrender.com/api/diagnostics
```

## Manual Fix: Redeploy

If you've made changes and need to redeploy:

### Option 1: Automatic (Git Push)
```bash
git add -A
git commit -m "Fix Render deployment"
git push origin main
```
Render will auto-deploy on push to main branch.

### Option 2: Manual Deploy
1. Go to Render dashboard
2. Click your service
3. Click **Manual Deploy**
4. Select **Clear build cache & deploy**

## Environment Variable Check

Run this in your local terminal to verify the correct values:

```bash
# Show environment file contents (check DATABASE_URL format)
cat /Users/edoomoniyi/sema-slim-env/sema-slim-companion.env
```

### Common DATABASE_URL Issues:
- ❌ `us-west2` (missing hyphen)
- ✅ `us-west-2` (correct format)
- ❌ `PORT=PORT` (literal string)
- ✅ `PORT=10000` (actual port number)

## Get Help from Logs

### What to Copy from Render Logs:
1. **Last 50 lines of Build Logs**
2. **Last 50 lines of Deploy Logs**
3. **Any error stack traces**

### Share With Me:
If still failing, copy the error messages from Render logs and share them. Look for:
- Lines starting with `Error:`
- Lines starting with `npm ERR!`
- Stack traces with file paths

## Verification Checklist

After deployment, verify:
- [ ] Build completes successfully
- [ ] dist/index.js is created (~109kb)
- [ ] dist/public/ directory exists
- [ ] Server starts without errors
- [ ] Health check responds: `GET /health`
- [ ] Diagnostics responds: `GET /api/diagnostics`
- [ ] Database connection works
- [ ] Clerk authentication initialized

## Quick Fixes

### Fix 1: Clear Build Cache
Sometimes old cache causes issues:
1. Render Dashboard → Service → Settings
2. Scroll to **Danger Zone**
3. Click **Clear build cache**
4. Go back to Overview → **Manual Deploy**

### Fix 2: Verify Git Branch
Ensure Render is deploying from `main` branch:
1. Render Dashboard → Service → Settings
2. Check **Branch** = `main`
3. Check **Root Directory** = `/` (or empty)

### Fix 3: Force Reinstall
If dependencies are corrupted:
1. Change render.yaml buildCommand to:
   ```yaml
   buildCommand: rm -rf node_modules package-lock.json && npm install && npm run build
   ```
2. Commit and push
3. After successful deploy, revert back to `npm ci && npm run build`

## Expected Behavior

### Successful Build
```
Running build command 'npm ci && npm run build'...
added 1234 packages in 30s
> rest-express@1.0.0 build
> vite build && esbuild server/index.ts...
✓ 3063 modules transformed.
✓ built in 4.5s
  dist/index.js  109.6kb
Build successful!
```

### Successful Start
```
Starting service with 'npm start'...
> rest-express@1.0.0 start
> NODE_ENV=production node dist/index.js

Starting server initialization
Initializing Clerk middleware
Registering routes...
Server started successfully on port 10000
==> Your service is live 🎉
```

## Still Not Working?

1. **Check Render Status**: https://status.render.com
2. **Copy Error Logs**: Get the exact error messages
3. **Check Environment**: Verify all 7 environment variables are set
4. **Test Locally**: Run `npm run build && npm start` locally with env vars

---

**Next Steps:**
1. Check Render logs for specific error
2. Apply relevant fix from above
3. Redeploy if needed
4. Share error logs if issue persists
