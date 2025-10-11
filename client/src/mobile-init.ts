// Mobile initialization for Capacitor
// Stub implementation for web - actual implementation only works in mobile builds

export async function initializeMobile() {
  // No-op for web builds
  // Mobile initialization happens in Capacitor native builds
  console.debug('Mobile initialization skipped (web environment)');
}

// Helper function to check if running on mobile
export async function isMobile(): Promise<boolean> {
  return false;
}

// Get platform type
export async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  return 'web';
}
