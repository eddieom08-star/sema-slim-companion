// Vercel Serverless Function Handler
// This wraps your Express app for Vercel's serverless environment

import { createServer } from '../dist/index.js';

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
      app = await createServer();
      console.log('Express app initialized successfully');
    } catch (error) {
      initError = error;
      console.error('Failed to initialize Express app:', error);
      return res.status(500).json({
        message: 'Server initialization failed',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
