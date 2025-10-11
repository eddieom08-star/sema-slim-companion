// Mobile initialization for Capacitor
// Use dynamic imports to avoid bundling mobile-only dependencies in web builds

export async function initializeMobile() {
  try {
    // Check if Capacitor is available
    const { Capacitor } = await import('@capacitor/core');

    if (!Capacitor.isNativePlatform()) {
      return; // Skip if running in browser
    }

    // Dynamically import mobile plugins only when needed
    const [
      { StatusBar, Style },
      { SplashScreen },
      { Keyboard }
    ] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/keyboard')
    ]);

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }

    // Configure keyboard
    await Keyboard.setAccessoryBarVisible({ isVisible: true });

    // Hide splash screen after app loads
    await SplashScreen.hide();

    console.log('Mobile platform initialized:', Capacitor.getPlatform());
  } catch (error) {
    // Silently fail if Capacitor is not available (web environment)
    console.debug('Mobile initialization skipped:', error);
  }
}

// Helper function to check if running on mobile
export async function isMobile(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Get platform type
export async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  } catch {
    return 'web';
  }
}
