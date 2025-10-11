# SemaSlim Deployment Guide

## 🚀 Vercel Deployment with Staging & Production

### Prerequisites
- Vercel account
- GitHub repository connected
- Neon Database (already configured)
- Clerk account (already configured)
- Anthropic API key

---

## 📋 Step-by-Step Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link Your Project
```bash
vercel link
```
Follow prompts:
- Select your scope
- Link to existing project or create new
- Link to `/Users/edoomoniyi/sema-slim-companion`

### 4. Configure Environment Variables

#### For Staging Environment:
```bash
# Set staging environment variables
vercel env add DATABASE_URL preview
# Paste your Neon database connection string from .env

vercel env add CLERK_PUBLISHABLE_KEY preview
# Paste your Clerk publishable key from .env

vercel env add CLERK_SECRET_KEY preview
# Paste your Clerk secret key from .env

vercel env add VITE_CLERK_PUBLISHABLE_KEY preview
# Paste your Clerk publishable key (same as above)

vercel env add ANTHROPIC_API_KEY preview
# Paste your Anthropic API key from .env

vercel env add SESSION_SECRET preview
# Generate with: openssl rand -base64 32

vercel env add NODE_ENV preview
# Enter: production
```

#### For Production Environment:
Repeat the same commands but replace `preview` with `production`:
```bash
vercel env add DATABASE_URL production
vercel env add CLERK_PUBLISHABLE_KEY production
# ... etc
```

**⚠️ IMPORTANT**: For production, you should:
1. Create production Clerk keys at https://dashboard.clerk.com
2. Consider creating a separate production Neon database
3. Generate a strong SESSION_SECRET: `openssl rand -base64 32`

### 5. Deploy to Staging
```bash
# Deploy to preview/staging
vercel

# Or with alias
vercel --prod=false
```

This will create a preview URL like: `https://semaslim-xyz123.vercel.app`

### 6. Deploy to Production
```bash
vercel --prod
```

This will deploy to: `https://semaslim.vercel.app` (or your custom domain)

---

## 🗄️ Database Setup

### Neon Database (Already Configured ✅)
- **Provider**: Neon PostgreSQL
- **Connection**: Already in .env
- **Serverless**: ✅ Perfect for Vercel
- **No additional setup needed**

#### Optional: Create Staging Database
For better separation, create a staging database:
1. Go to https://neon.tech
2. Create new database "semaslim-staging"
3. Copy connection string
4. Add to Vercel preview environment

---

## 🔐 Authentication Setup

### Clerk (Already Configured ✅)
- **Current**: Test keys configured
- **For Production**: Create production instance

#### Production Clerk Setup:
1. Go to https://dashboard.clerk.com
2. Create new application "SemaSlim Production"
3. Copy production keys
4. Add to Vercel production environment
5. Add your production domain to Clerk allowed domains

---

## 🌐 Custom Domain Setup (Optional but Recommended)

### Add Custom Domain to Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `app.semaslim.com`)
3. Configure DNS:
   - Type: `CNAME`
   - Name: `app` (or `@` for apex)
   - Value: `cname.vercel-dns.com`

### Update Clerk Redirect URLs:
1. Go to Clerk Dashboard → Your Production App
2. Add production URLs:
   - `https://app.semaslim.com`
   - `https://semaslim.vercel.app`

---

## 📱 iOS App Configuration

After deploying, update iOS app to point to production API:

### Option 1: Environment-based
Update `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.semaslim.app',
  appName: 'SemaSlim',
  webDir: 'dist/public',
  server: {
    url: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://semaslim.vercel.app', // Your production URL
    cleartext: false,
  },
  // ... rest of config
};
```

### Option 2: Static Production URL
For production builds, use:
```typescript
server: {
  url: 'https://app.semaslim.com', // Your custom domain
  cleartext: false,
}
```

---

## 🔄 CI/CD Workflow

### Automatic Deployments (Recommended)
Vercel automatically deploys:
- **Main branch** → Production
- **Other branches** → Preview/Staging

### Git Workflow:
```bash
# Feature development
git checkout -b feature/new-feature
git push origin feature/new-feature
# → Creates preview deployment

# Staging
git checkout staging
git merge feature/new-feature
git push origin staging
# → Updates staging environment

# Production
git checkout main
git merge staging
git push origin main
# → Deploys to production
```

---

## 🛡️ Security Checklist

### Before Production Deployment:
- [ ] Generate strong `SESSION_SECRET`
- [ ] Use production Clerk keys
- [ ] Configure production database
- [ ] Set up custom domain with SSL
- [ ] Review CORS settings in `server/index.ts`
- [ ] Enable Vercel password protection for staging
- [ ] Set up Vercel firewall rules
- [ ] Configure rate limiting appropriately
- [ ] Review CSP headers in helmet configuration

---

## 📊 Monitoring & Analytics

### Recommended Setup:

#### 1. Vercel Analytics (Built-in)
- Already included with Vercel
- View in Vercel Dashboard

#### 2. Vercel Speed Insights
```bash
npm install @vercel/speed-insights
```

Add to your app:
```typescript
// client/src/main.tsx
import { SpeedInsights } from '@vercel/speed-insights/react';

// In your render
<SpeedInsights />
```

#### 3. Error Tracking (Recommended: Sentry)
```bash
npm install @sentry/react @sentry/node
```

---

## 🚨 Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify environment variables are set
- Test build locally: `npm run build`

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Check Neon database is active
- Ensure SSL mode is required

### Clerk Authentication Fails
- Verify CLERK_PUBLISHABLE_KEY is set
- Check Clerk dashboard for allowed domains
- Ensure production domain is whitelisted

### CORS Errors
- Add your domain to `ALLOWED_ORIGINS` environment variable
- Check `server/index.ts` CORS configuration

---

## 💡 Additional Recommendations

### 1. Cloudflare (Optional)
**Use if you need:**
- DDoS protection
- Additional caching
- Rate limiting
- Firewall rules
- Analytics

**Setup:**
1. Add domain to Cloudflare
2. Point DNS to Vercel
3. Configure Cloudflare proxy
4. Set SSL mode to "Full (strict)"

**Verdict**: Not necessary initially. Vercel provides:
- Edge caching
- DDoS protection
- SSL certificates
- Global CDN

Consider Cloudflare later if you need advanced features.

### 2. Redis (For Session Storage)
**Current**: Using memorystore (in-memory)
**Recommended for Production**: Upstash Redis

```bash
npm install @upstash/redis
```

Configure:
1. Create Upstash account
2. Create Redis database
3. Add URL to environment variables
4. Update session configuration

### 3. File Storage (For Future)
If you add file uploads later:
- **Vercel Blob Storage** (recommended)
- **AWS S3**
- **Cloudinary** (for images)

---

## 📞 Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Clerk Docs**: https://clerk.com/docs
- **Capacitor Docs**: https://capacitorjs.com/docs

---

## 🎯 Quick Start Commands

```bash
# Deploy to staging
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs [deployment-url]

# List deployments
vercel ls

# Check environment variables
vercel env ls
```

---

## ✅ Post-Deployment Checklist

- [ ] Staging environment deployed successfully
- [ ] Production environment deployed successfully
- [ ] Database migrations run (if any)
- [ ] Environment variables configured
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Clerk redirect URLs updated
- [ ] iOS app pointing to production API
- [ ] Test all critical user flows
- [ ] Monitor error logs
- [ ] Set up alerts/notifications
