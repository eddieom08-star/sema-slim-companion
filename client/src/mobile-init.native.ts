// Mobile initialization for Capacitor - NATIVE VERSION
// This file is used for iOS/Android builds only
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export async function initializeMobile() {
  if (!Capacitor.isNativePlatform()) {
    return; // Skip if running in browser
  }

  try {
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
    console.error('Error initializing mobile platform:', error);
  }
}

// Helper function to check if running on mobile
export async function isMobile(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

// Get platform type
export async function getPlatform(): Promise<'ios' | 'android' | 'web'> {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
