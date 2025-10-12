// Simple test endpoint to check if environment variables are available
// This doesn't import anything from dist/ to isolate the test

export default function handler(req, res) {
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'not set',
      isVercel: process.env.VERCEL === '1',
      vercelEnv: process.env.VERCEL_ENV || 'not set',
    },
    clerkEnvVars: {
      hasPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      hasViteKey: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
      publishableKeyPrefix: process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 20) || 'NOT SET',
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 15) || 'NOT SET',
    },
    allEnvKeys: Object.keys(process.env).sort(),
    clerkKeys: Object.keys(process.env).filter(k => k.includes('CLERK')),
  };

  res.status(200).json(envCheck);
}
