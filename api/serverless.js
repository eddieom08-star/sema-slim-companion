// Vercel Serverless Function Handler
// This wraps your Express app for Vercel's serverless environment

import { createServer } from './server.js';

// Cache the Express app instance
let app = null;
let initError = null;

export default async function handler(req, res) {
  // If previous initialization failed, return error immediately
  if (initError) {
    console.error('Previous initialization error:', initError);
    return res.status(500).json({
      message: 'Server initialization failed',
      error: initError.message,
      hint: 'Check Vercel environment variables and deployment logs'
    });
  }

  // Initialize app only once
  if (!app) {
    try {
      console.log('Initializing Express app for Vercel serverless...');
      console.log('Environment check:', {
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL,
        hasClerkPublishable: !!process.env.CLERK_PUBLISHABLE_KEY,
        hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
        clerkKeysInEnv: Object.keys(process.env).filter(k => k.includes('CLERK')).join(', ')
      });
      app = await createServer();
      console.log('Express app initialized successfully');
    } catch (error) {
      initError = error;
      console.error('Failed to initialize Express app:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return res.status(500).json({
        message: 'Server initialization failed',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        hint: 'Check Vercel function logs for detailed error information'
      });
    }
  }

  // Handle the request with Express
  try {
    return app(req, res);
  } catch (error) {
    console.error('Request handling error:', error);
    return res.status(500).json({
      message: 'Request handling failed',
      error: error.message
    });
  }
}
