// Mobile initialization for Capacitor
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { clerkNative } from '@/lib/clerkNative';
import { setAuthTokenGetter } from '@/lib/queryClient';

/**
 * Fix for iOS WebView keyboard not appearing on input focus
 * This ensures all input elements properly trigger the keyboard
 */
function setupKeyboardFocusFix() {
  // Listen for tap events on input elements and explicitly focus them
  document.addEventListener('touchend', async (event) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      console.log('[Mobile Init] Input element tapped:', target.tagName);
      // Small delay to ensure the touch event completes
      setTimeout(async () => {
        const inputElement = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        inputElement.focus();
        // Force keyboard to show
        try {
          await Keyboard.show();
          console.log('[Mobile Init] Keyboard.show() called');
        } catch (e) {
          console.log('[Mobile Init] Keyboard.show() error:', e);
        }
      }, 10);
    }
  }, { passive: true });

  // Also listen for focus events and force keyboard
  document.addEventListener('focusin', async (event) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA'
    ) {
      console.log('[Mobile Init] Input focused:', target.tagName);
      try {
        await Keyboard.show();
      } catch (e) {
        // Keyboard.show might not be available on all platforms
      }
    }
  });

  // Add keyboard event listeners for debugging
  Keyboard.addListener('keyboardWillShow', (info) => {
    console.log('[Mobile Init] Keyboard will show, height:', info.keyboardHeight);
  });

  Keyboard.addListener('keyboardDidShow', (info) => {
    console.log('[Mobile Init] Keyboard did show, height:', info.keyboardHeight);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    console.log('[Mobile Init] Keyboard will hide');
  });

  Keyboard.addListener('keyboardDidHide', () => {
    console.log('[Mobile Init] Keyboard did hide');
  });

  console.log('[Mobile Init] Keyboard focus fix installed');
}

export async function initializeMobile() {
  if (!Capacitor.isNativePlatform()) {
    console.debug('Mobile initialization skipped (web environment)');
    return;
  }

  console.log('[Mobile Init] Initializing mobile features...');

  // Fix iOS keyboard issues - must be done early
  setupKeyboardFocusFix();

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
    // Configure keyboard - ensure it shows on input focus
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
    // Scroll the content when keyboard appears
    await Keyboard.setScroll({ isDisabled: false });
    console.log('[Mobile Init] Keyboard configured');
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
