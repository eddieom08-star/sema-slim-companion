// Vercel Serverless Function Handler
// This wraps your Express app for Vercel's serverless environment

import { createServer } from '../dist/index.js';

// Cache the Express app instance
let app = null;

export default async function handler(req, res) {
  // Initialize app only once
  if (!app) {
    app = await createServer();
  }

  // Handle the request with Express
  return app(req, res);
}
