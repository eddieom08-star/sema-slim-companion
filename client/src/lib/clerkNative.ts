import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

/**
 * TypeScript interface for the Clerk native plugin
 */
export interface ClerkNativePlugin {
  /**
   * Initialize Clerk with publishable key
   */
  initialize(options: { publishableKey: string }): Promise<{ success: boolean; message?: string }>;

  /**
   * Present native sign-in UI
   */
  presentSignIn(): Promise<{ success: boolean; message?: string }>;

  /**
   * Present native sign-up UI
   */
  presentSignUp(): Promise<{ success: boolean; message?: string }>;

  /**
   * Sign out current user
   */
  signOut(): Promise<{ success: boolean; message?: string }>;

  /**
   * Get current user information
   */
  getUser(): Promise<{
    user?: {
      id: string;
      emailAddress: string;
      firstName: string;
      lastName: string;
      imageUrl: string;
    } | null;
    message?: string;
  }>;

  /**
   * Check if user is signed in
   */
  isSignedIn(): Promise<{ isSignedIn: boolean; message?: string }>;

  /**
   * Get session token for API authentication
   */
  getToken(): Promise<{ token?: string; message?: string }>;
}

// Register the plugin
const ClerkNative = registerPlugin<ClerkNativePlugin>('ClerkPlugin');

/**
 * High-level wrapper for Clerk native authentication
 *
 * Usage:
 * ```typescript
 * import { clerkNative } from '@/lib/clerkNative';
 *
 * // Initialize
 * await clerkNative.initialize();
 *
 * // Sign in
 * await clerkNative.signIn();
 *
 * // Get user
 * const user = await clerkNative.getUser();
 * ```
 */
export const clerkNative = {
  /**
   * Check if we're on a native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Initialize Clerk with publishable key from environment
   */
  async initialize(): Promise<void> {
    if (!this.isNativePlatform()) {
      console.log('[ClerkNative] Skipping initialization (not on native platform)');
      return;
    }

    const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('VITE_CLERK_PUBLISHABLE_KEY not found in environment');
    }

    try {
      await ClerkNative.initialize({ publishableKey });
    } catch (error) {
      console.error('[ClerkNative] Initialization failed:', error);
      throw error;
    }
  },

  /**
   * Present native sign-in UI
   */
  async presentSignIn(): Promise<{ success: boolean; message?: string; isSignedIn?: boolean }> {
    if (!this.isNativePlatform()) {
      console.warn('[ClerkNative] presentSignIn() called on web platform');
      return { success: false };
    }

    try {
      const result = await ClerkNative.presentSignIn();
      return result;
    } catch (error) {
      console.error('[ClerkNative] Sign-in failed:', error);
      throw error;
    }
  },

  /**
   * Present native sign-up UI
   */
  async presentSignUp(): Promise<{ success: boolean; message?: string; isSignedIn?: boolean }> {
    if (!this.isNativePlatform()) {
      console.warn('[ClerkNative] presentSignUp() called on web platform');
      return { success: false };
    }

    try {
      const result = await ClerkNative.presentSignUp();
      return result;
    } catch (error) {
      console.error('[ClerkNative] Sign-up failed:', error);
      throw error;
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (!this.isNativePlatform()) {
      return;
    }

    try {
      await ClerkNative.signOut();
    } catch (error) {
      console.error('[ClerkNative] Sign-out failed:', error);
      throw error;
    }
  },

  /**
   * Get current user information
   */
  async getUser(): Promise<{
    id: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
    imageUrl: string;
  } | null> {
    if (!this.isNativePlatform()) {
      return null;
    }

    try {
      const result = await ClerkNative.getUser();
      return result.user || null;
    } catch (error) {
      console.error('[ClerkNative] Get user failed:', error);
      return null;
    }
  },

  /**
   * Check if user is signed in
   * IMPORTANT: Also verifies the session is valid by checking if we can get a token
   */
  async isSignedIn(): Promise<{ isSignedIn: boolean; message?: string }> {
    if (!this.isNativePlatform()) {
      return { isSignedIn: false };
    }

    try {
      if (!ClerkNative || typeof ClerkNative.isSignedIn !== 'function') {
        console.error('[ClerkNative] isSignedIn: Plugin not available');
        return { isSignedIn: false, message: 'Plugin not available' };
      }

      const result = await ClerkNative.isSignedIn();

      // Verify session by checking if we can actually get a token
      // This catches stale sessions where isSignedIn=true but getToken fails
      if (result.isSignedIn) {
        try {
          const tokenResult = await ClerkNative.getToken();
          if (!tokenResult.token) {
            return { isSignedIn: false, message: 'Session expired - please sign in again' };
          }
        } catch (tokenError: any) {
          return { isSignedIn: false, message: 'Session expired - please sign in again' };
        }
      }

      return result;
    } catch (error: any) {
      console.error('[ClerkNative] isSignedIn check failed:', error?.message);
      return { isSignedIn: false, message: error?.message || 'Unknown error' };
    }
  },

  /**
   * Get session token for API authentication
   */
  async getToken(): Promise<string | null> {
    if (!this.isNativePlatform()) {
      return null;
    }

    try {
      const result = await ClerkNative.getToken();
      return result.token || null;
    } catch (error: any) {
      console.error('[ClerkNative] getToken failed:', error?.message);
      return null;
    }
  },
};

export default clerkNative;
