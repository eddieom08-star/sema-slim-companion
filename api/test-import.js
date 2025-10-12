// Test if we can import from server.js
export default async function handler(req, res) {
  try {
    console.log('Attempting to import from ./server.js...');

    // Try to import
    const serverModule = await import('./server.js');

    console.log('Import successful! Module keys:', Object.keys(serverModule));

    // Check if createServer exists
    if (typeof serverModule.createServer === 'function') {
      res.status(200).json({
        success: true,
        message: 'Successfully imported server.js',
        hasCreateServer: true,
        moduleKeys: Object.keys(serverModule)
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Imported but createServer is not a function',
        moduleKeys: Object.keys(serverModule),
        createServerType: typeof serverModule.createServer
      });
    }
  } catch (error) {
    console.error('Failed to import server.js:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import server.js',
      error: error.message,
      stack: error.stack,
      code: error.code
    });
  }
}
