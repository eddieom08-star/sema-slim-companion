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
 * Native-only auth hook using Clerk iOS SDK
 *
 * On mobile: Uses native Clerk SDK for auth state, shows app when signed in
 * User data fetching happens in background, doesn't block rendering
 */
export function useAuthNative() {
  // Subscribe to global state changes
  const isSignedIn = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => globalIsSignedIn
  );

  const isLoaded = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => globalIsLoaded
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
    if (hasCheckedRef.current && authCheckCounter === 0) {
      return;
    }

    let mounted = true;
    hasCheckedRef.current = true;

    const checkAuth = async () => {
      try {
        // Small delay to let native layer initialize
        await new Promise(resolve => setTimeout(resolve, 200));

        const result = await clerkNative.isSignedIn();
        console.log('[useAuthNative] Native isSignedIn result:', result.isSignedIn);

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
    retry: false, // Don't retry on failure
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
