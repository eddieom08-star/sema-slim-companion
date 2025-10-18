# Deploy SemaSlim to Render.com

## ✅ **Database Setup (Already Done)**

You're using **Neon PostgreSQL** which is perfect! Your database:
```
postgresql://username:password@your-neon-host.neon.tech/dbname?sslmode=require
```

> **Note:** Replace with your actual Neon database connection string from your Neon dashboard or .env file.

**Database is serverless and ready to use from Render** ✅

---

## 🚀 **Deploy to Render**

### Step 1: Sign Up / Login
1. Go to https://render.com
2. Sign up or login with GitHub

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account if not already
3. Select repository: `eddieom08-star/sema-slim-companion`
4. Click **"Connect"**

### Step 3: Configure Service

**Basic Settings:**
- **Name**: `semaslim-app` (or your choice)
- **Region**: Oregon (US West) - closest to Neon database
- **Branch**: `main`
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Instance Type:**
- Free tier is fine to start
- Upgrade to paid if you need better performance

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** for each:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `DATABASE_URL` | Your Neon connection string | Copy from .env |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | From .env |
| `CLERK_SECRET_KEY` | Your Clerk secret key | From .env |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same as CLERK_PUBLISHABLE_KEY | For frontend |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | From .env |
| `SESSION_SECRET` | Generate with: `openssl rand -base64 32` | Strong random string |
| `PORT` | `10000` | Render default |

**⚠️ Important**:
- Click **"Generate Value"** for SESSION_SECRET if available
- Don't share these keys publicly!

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repo
   - Install dependencies
   - Build the app
   - Start the server
3. Watch the logs for any errors

### Step 6: Update Clerk Allowed Origins
Once deployed, add your Render URL to Clerk:
1. Go to https://dashboard.clerk.com
2. Select your app
3. **Settings** → **Domains**
4. Add: `https://semaslim-app.onrender.com` (or your Render URL)

---

## 📱 **Update iOS App to Use Render**

After deployment, update your iOS app configuration:

### Option 1: Update capacitor.config.ts
```typescript
const config: CapacitorConfig = {
  appId: 'com.semaslim.app',
  appName: 'SemaSlim',
  webDir: 'dist/public',
  server: {
    url: 'https://semaslim-app.onrender.com', // Your Render URL
    cleartext: false,
  },
  // ... rest of config
};
```

### Option 2: Use Environment Variable
Better approach for multiple environments:
```typescript
const config: CapacitorConfig = {
  appId: 'com.semaslim.app',
  appName: 'SemaSlim',
  webDir: 'dist/public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:5000',
    cleartext: false,
  },
  // ... rest of config
};
```

Then build with:
```bash
CAPACITOR_SERVER_URL=https://semaslim-app.onrender.com npm run mobile:ios
```

---

## 🔍 **Verify Deployment**

### Check Health
Visit: `https://your-app.onrender.com`
- Should see your app loading
- Check browser console for errors

### Test API
Visit: `https://your-app.onrender.com/api/health` (if you have a health endpoint)

### Check Logs
In Render dashboard:
- Click on your service
- Go to **"Logs"** tab
- Look for startup messages and errors

---

## 🐛 **Troubleshooting**

### Build Fails
**Check:**
- All dependencies in package.json
- Build command is correct
- Node version compatibility

**Fix**: Update `package.json` engines:
```json
"engines": {
  "node": ">=20.0.0"
}
```

### Database Connection Fails
**Check:**
- DATABASE_URL is correct
- Neon database is active
- Connection string includes `?sslmode=require`

### App Shows White Screen
**Check:**
- VITE_CLERK_PUBLISHABLE_KEY is set
- Check browser console for errors
- Verify Clerk domain is whitelisted

### API Calls Fail (CORS)
**Check:**
- Render URL is added to CORS config in `server/index.ts`
- Update ALLOWED_ORIGINS environment variable

---

## 🔄 **Automatic Deployments**

Render automatically deploys when you push to `main` branch:
1. Make changes locally
2. Commit: `git commit -am "Update feature"`
3. Push: `git push origin main`
4. Render detects push and redeploys automatically
5. Watch logs in Render dashboard

---

## 💰 **Pricing**

**Free Tier:**
- 750 hours/month (enough for 1 app)
- Spins down after 15 min of inactivity
- Cold starts when accessed (may be slow)

**Starter ($7/month):**
- Always on
- No cold starts
- Better performance

**Pro ($25/month):**
- Horizontal scaling
- Custom domains
- Better resources

---

## 🎯 **Post-Deployment Checklist**

- [ ] App deployed successfully on Render
- [ ] All environment variables configured
- [ ] Database connected and working
- [ ] Clerk authentication working
- [ ] API endpoints responding
- [ ] Render URL added to Clerk domains
- [ ] iOS app configured to use Render URL
- [ ] Automatic deployments working
- [ ] Logs show no errors

---

## 📊 **Monitoring**

### Built-in Render Monitoring
- CPU usage
- Memory usage
- Response times
- Error rates

### Add Custom Monitoring (Optional)
- Sentry for error tracking
- LogDNA for log management
- Datadog for APM

---

## 🔐 **Security Recommendations**

1. **Rotate API Keys** - Since they were in git history
2. **Use Production Clerk Instance** - Create separate prod app
3. **Enable HTTPS** - Render does this automatically
4. **Set Strong SESSION_SECRET** - Generate new random string
5. **Review CORS Settings** - Only allow your domains
6. **Enable Rate Limiting** - Already configured in your app
7. **Monitor Logs** - Watch for suspicious activity

---

## 📝 **Your Database Details**

**Provider**: Neon PostgreSQL
**Type**: Serverless
**Region**: US West 2 (Oregon)
**SSL**: Required
**Connection String**: Already configured in DATABASE_URL

**No additional database setup needed!** ✅

---

## 🆘 **Need Help?**

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Your Database**: https://console.neon.tech
- **Clerk Dashboard**: https://dashboard.clerk.com

---

## 🎉 **Quick Start**

```bash
# 1. Make sure latest code is on GitHub
git add -A
git commit -m "Prepare for Render deployment"
git push origin main

# 2. Go to Render.com
# 3. Connect repo and configure
# 4. Add environment variables
# 5. Deploy!
```

That's it! Your app will be live in ~5 minutes. 🚀
