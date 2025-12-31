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

  // CRITICAL: Set up auth token getter FIRST - this must happen before any API calls
  // Do this before anything else that might fail
  setAuthTokenGetter(async () => {
    try {
      const token = await clerkNative.getToken();
      return token;
    } catch (error) {
      console.error('[Mobile Init] Token getter error:', error);
      return null;
    }
  });
  console.log('[Mobile Init] Auth token getter configured');

  // Now initialize other mobile features (these can fail without breaking auth)
  try {
    // Configure status bar
    if (Capacitor.getPlatform() === 'ios') {
      await StatusBar.setStyle({ style: Style.Light });
    }
  } catch (error) {
    console.warn('[Mobile Init] StatusBar config error:', error);
  }

  try {
    // Hide splash screen after a delay
    setTimeout(async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn('[Mobile Init] SplashScreen hide error:', e);
      }
    }, 500);
  } catch (error) {
    console.warn('[Mobile Init] SplashScreen setup error:', error);
  }

  try {
    // Configure keyboard
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (error) {
    console.warn('[Mobile Init] Keyboard config error:', error);
  }

  try {
    // Initialize Clerk Native SDK
    await clerkNative.initialize();
    console.log('[Mobile Init] Clerk Native initialized');
  } catch (error) {
    console.warn('[Mobile Init] Clerk init error:', error);
  }

  console.log('[Mobile Init] Mobile features initialized');
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
