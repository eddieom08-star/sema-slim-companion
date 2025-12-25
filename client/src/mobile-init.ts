// Mobile initialization for Capacitor
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { clerkNative } from '@/lib/clerkNative';
import { setAuthTokenGetter } from '@/lib/queryClient';

export async function initializeMobile() {
  if (!Capacitor.isNativePlatform()) {
    console.debug('Mobile initialization skipped (web environment)');
    return;
  }

  console.log('[Mobile Init] Initializing mobile features...');

  try {
    // Configure status bar
    if (Capacitor.getPlatform() === 'ios') {
      await StatusBar.setStyle({ style: Style.Light });
    }

    // Hide splash screen after a delay
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 500);

    // Configure keyboard
    await Keyboard.setAccessoryBarVisible({ isVisible: true });

    // Initialize Clerk Native SDK
    await clerkNative.initialize();
    console.log('[Mobile Init] Clerk Native initialized');

    // Set up auth token getter for API requests
    setAuthTokenGetter(async () => {
      console.log('[Mobile Init] Token getter called');
      const token = await clerkNative.getToken();
      console.log('[Mobile Init] Token result:', token ? `${token.substring(0, 20)}...` : 'null');
      return token;
    });
    console.log('[Mobile Init] Auth token getter configured');

    console.log('[Mobile Init] Mobile features initialized successfully');
  } catch (error) {
    console.error('[Mobile Init] Error initializing mobile features:', error);
  }
}

// Helper function to check if running on mobile
export async function isMobile(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

// Get platform type
export async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    return platform;
  }
  return 'web';
}
