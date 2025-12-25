import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { clerkNative } from "@/lib/clerkNative";
import { isTokenGetterReady } from "@/lib/queryClient";

// Helper to get auth headers for debugging
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    const token = await clerkNative.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('[getAuthHeaders] Error:', error);
  }
  return headers;
}

// Global flag to prevent duplicate debug calls
declare global {
  interface Window {
    __debugHeadersChecked?: boolean;
  }
}

/**
 * Native-only auth hook using Clerk iOS SDK
 * Does NOT use @clerk/clerk-react web SDK
 */
export function useAuthNative() {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [tokenReady, setTokenReady] = useState<boolean>(false);

  // Wait for token getter to be ready before enabling queries
  useEffect(() => {
    const checkTokenReady = () => {
      const ready = isTokenGetterReady();
      console.log('[useAuthNative] Token getter ready:', ready);
      setTokenReady(ready);
    };

    checkTokenReady();

    // Poll until ready (should be immediate after initialization)
    const interval = setInterval(() => {
      if (!tokenReady && isTokenGetterReady()) {
        console.log('[useAuthNative] Token getter became ready');
        setTokenReady(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [tokenReady]);

  // Check auth status from native plugin
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const result = await clerkNative.isSignedIn();
        console.log('[useAuthNative] isSignedIn check:', result);
        setIsSignedIn(result.isSignedIn);
        setIsLoaded(true);

        // Debug: Test what backend receives (only once when signed in)
        if (result.isSignedIn && tokenReady && !window.__debugHeadersChecked) {
          window.__debugHeadersChecked = true;
          try {
            const baseUrl = import.meta.env.PROD ? 'https://sema-slim-companion.vercel.app' : '';
            const debugRes = await fetch(`${baseUrl}/api/debug/headers`, {
              headers: await getAuthHeaders(),
              credentials: 'include',
            });
            const debugData = await debugRes.json();
            console.log('[useAuthNative] Backend debug response:', debugData);
          } catch (debugErr) {
            console.error('[useAuthNative] Debug endpoint failed:', debugErr);
          }
        }
      } catch (error) {
        console.error('[useAuthNative] Error checking sign-in status:', error);
        setIsSignedIn(false);
        setIsLoaded(true);
      }
    };

    checkAuthStatus();

    // Poll for auth status changes every 2 seconds
    const interval = setInterval(checkAuthStatus, 2000);

    return () => clearInterval(interval);
  }, [tokenReady]);

  const {
    data: user,
    isLoading: userLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isSignedIn && isLoaded && tokenReady,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  console.log('[useAuthNative] State:', {
    isSignedIn,
    isLoaded,
    tokenReady,
    hasUser: !!user,
    userLoading,
    hasError: !!error,
    queryEnabled: isSignedIn && isLoaded && tokenReady,
    isAuthenticated: isSignedIn && !!user
  });

  return {
    user,
    isLoading: !isLoaded || !tokenReady || (isSignedIn && userLoading),
    isAuthenticated: isSignedIn && !!user,
    isSignedIn, // Expose for mobile fallback routing
    error,
  };
}
