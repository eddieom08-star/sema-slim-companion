import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { clerkNative } from "@/lib/clerkNative";

const isMobile = Capacitor.isNativePlatform();

// Global auth state that persists across component mounts
const AUTH_STORAGE_KEY = 'semaslim_auth_signed_in';

function getStoredAuthState(): boolean {
  if (!isMobile) return false;
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setStoredAuthState(signedIn: boolean): void {
  if (!isMobile) return;
  try {
    if (signedIn) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// Global state management for cross-component sync
let globalIsSignedIn = getStoredAuthState();
let globalIsLoaded = !isMobile;
const listeners = new Set<() => void>();

// Failsafe: Ensure loading state eventually resolves on mobile
// This prevents infinite loading if the auth check never completes
if (isMobile && !globalIsLoaded) {
  console.log('[useAuthNative] Starting failsafe timer (10s)');
  setTimeout(() => {
    if (!globalIsLoaded) {
      console.warn('[useAuthNative] Failsafe triggered: forcing isLoaded=true after 10s');
      globalIsLoaded = true;
      listeners.forEach(listener => listener());
    }
  }, 10000);
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

function setGlobalSignedIn(signedIn: boolean) {
  console.log('[useAuthNative] setGlobalSignedIn:', signedIn);
  globalIsSignedIn = signedIn;
  setStoredAuthState(signedIn);
  notifyListeners();
}

function setGlobalLoaded(loaded: boolean) {
  globalIsLoaded = loaded;
  notifyListeners();
}

/**
 * Exported function to set signed-in state directly
 * Use after successful native sign-in to update global auth state
 */
export function setNativeAuthSignedIn(signedIn: boolean) {
  console.log('[useAuthNative] setNativeAuthSignedIn:', signedIn);
  setGlobalSignedIn(signedIn);
  setGlobalLoaded(true);
}

/**
 * Exported function to refresh auth state by re-checking with native SDK
 */
export function refreshNativeAuth() {
  console.log('[useAuthNative] refreshNativeAuth called');
  // Trigger re-check by clearing the stored state and reloading
  setStoredAuthState(false);
  globalIsLoaded = false;
  notifyListeners();
}

// Server snapshot for SSR consistency (returns same as initial client state)
function getServerSnapshotSignedIn() {
  return false;
}

function getServerSnapshotLoaded() {
  return !isMobile;
}

// Stable subscribe functions for useSyncExternalStore (prevents re-subscription on every render)
function subscribeToAuthState(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Stable getSnapshot functions
function getSnapshotSignedIn() {
  return globalIsSignedIn;
}

function getSnapshotLoaded() {
  return globalIsLoaded;
}

/**
 * Native-only auth hook using Clerk iOS SDK
 *
 * On mobile: Uses native Clerk SDK for auth state, shows app when signed in
 * User data fetching happens in background, doesn't block rendering
 */
export function useAuthNative() {
  // Subscribe to global state changes with SSR-safe snapshots
  // Using stable function references to prevent re-subscription on every render
  const isSignedIn = useSyncExternalStore(
    subscribeToAuthState,
    getSnapshotSignedIn,
    getServerSnapshotSignedIn
  );

  const isLoaded = useSyncExternalStore(
    subscribeToAuthState,
    getSnapshotLoaded,
    getServerSnapshotLoaded
  );

  const [authCheckCounter, setAuthCheckCounter] = useState(0);
  const hasCheckedRef = useRef(false);

  // Check auth status once on mount or when manually refreshed
  useEffect(() => {
    if (!isMobile) {
      return;
    }

    // Skip check if we already know we're signed in (from sessionStorage or previous sign-in)
    if (globalIsSignedIn && globalIsLoaded) {
      console.log('[useAuthNative] Already signed in, skipping check');
      return;
    }

    // Prevent double-checking in React strict mode
    // BUT still ensure loaded state is set if we have stored auth
    if (hasCheckedRef.current && authCheckCounter === 0) {
      // Critical: If we have stored auth state, use it and mark as loaded
      // This fixes infinite loading when strict mode remounts
      if (!globalIsLoaded) {
        console.log('[useAuthNative] Strict mode remount - setting loaded from stored state');
        setGlobalLoaded(true);
      }
      return;
    }

    let mounted = true;
    hasCheckedRef.current = true;

    const checkAuth = async () => {
      try {
        // Minimal delay to let native layer initialize (reduced from 200ms)
        await new Promise(resolve => setTimeout(resolve, 50));

        // Add timeout to prevent indefinite hanging if native bridge fails
        const timeoutPromise = new Promise<{ isSignedIn: boolean; timedOut: true }>((resolve) => {
          setTimeout(() => {
            console.warn('[useAuthNative] Native isSignedIn check timed out after 5s');
            resolve({ isSignedIn: false, timedOut: true });
          }, 5000);
        });

        const result = await Promise.race([
          clerkNative.isSignedIn(),
          timeoutPromise
        ]);

        console.log('[useAuthNative] Native isSignedIn result:', result.isSignedIn, 'timedOut' in result ? '(timed out)' : '');

        if (mounted) {
          setGlobalSignedIn(result.isSignedIn);
          setGlobalLoaded(true);
        }
      } catch (error) {
        console.error('[useAuthNative] Error:', error);
        if (mounted) {
          setGlobalSignedIn(false);
          setGlobalLoaded(true);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [authCheckCounter]);

  // Expose global auth functions
  useEffect(() => {
    if (!isMobile) return;

    // Refresh auth by re-checking with native SDK
    (window as any).refreshAuth = () => {
      setAuthCheckCounter(prev => prev + 1);
    };

    // Directly set signed-in state (use after successful sign-in)
    (window as any).setSignedIn = (signedIn: boolean) => {
      console.log('[useAuthNative] setSignedIn called:', signedIn);
      setGlobalSignedIn(signedIn);
      setGlobalLoaded(true);
    };

    return () => {
      delete (window as any).refreshAuth;
      delete (window as any).setSignedIn;
    };
  }, []);

  // Fetch user data in background - don't block on this for mobile
  const {
    data: user,
    error,
  } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isSignedIn && isLoaded,
    retry: 2, // Retry twice on failure (network issues are common on mobile)
    retryDelay: 1000, // 1 second between retries
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch on mount to ensure fresh data
    refetchOnReconnect: true, // Refetch when connection is restored
  });

  // CRITICAL: On mobile, loading state is ONLY based on initial auth check
  // Don't wait for user data - that can load in background
  // This prevents the flashing between loading and content
  const isLoading = !isLoaded;

  return {
    user,
    isLoading,
    isAuthenticated: isSignedIn && !!user,
    isSignedIn, // On mobile, use this for routing
    error,
  };
}
