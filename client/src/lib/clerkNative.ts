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

    console.log('[ClerkNative] Initializing with key:', publishableKey.substring(0, 20) + '...');

    try {
      const result = await ClerkNative.initialize({ publishableKey });
      console.log('[ClerkNative] Initialization result:', result);
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

    console.log('[ClerkNative] Presenting sign-in UI');

    try {
      const result = await ClerkNative.presentSignIn();
      console.log('[ClerkNative] Sign-in result:', result);
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

    console.log('[ClerkNative] Presenting sign-up UI');

    try {
      const result = await ClerkNative.presentSignUp();
      console.log('[ClerkNative] Sign-up result:', result);
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

    console.log('[ClerkNative] Signing out');

    try {
      const result = await ClerkNative.signOut();
      console.log('[ClerkNative] Sign-out result:', result);
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
   */
  async isSignedIn(): Promise<{ isSignedIn: boolean; message?: string }> {
    if (!this.isNativePlatform()) {
      return { isSignedIn: false };
    }

    try {
      const result = await ClerkNative.isSignedIn();
      return result;
    } catch (error) {
      console.error('[ClerkNative] isSignedIn check failed:', error);
      return { isSignedIn: false };
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
    } catch (error) {
      console.error('[ClerkNative] getToken failed:', error);
      return null;
    }
  },
};

export default clerkNative;
