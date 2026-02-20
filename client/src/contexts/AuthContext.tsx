import { createContext, useContext, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clerkNative } from '@/lib/clerkNative';
import { useLocation } from 'wouter';

interface AuthState {
  isLoading: boolean;
  isSignedIn: boolean;
  isAuthenticated: boolean;
  user: any | null;
  userId: string | null;
  error: Error | null;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  setSignedIn: (value: boolean) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [mobileSignedIn, setMobileSignedIn] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);

  // Check native auth state once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await clerkNative.isSignedIn();
        if (!cancelled) {
          setMobileSignedIn(result.isSignedIn);
        }
      } catch {
        if (!cancelled) {
          setMobileSignedIn(false);
        }
      } finally {
        if (!cancelled) {
          setMobileLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setSignedIn = useCallback((value: boolean) => {
    setMobileSignedIn(value);
    setMobileLoaded(true);
    if (value) {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await clerkNative.signOut();
    } catch (error) {
      console.error('[Auth] Sign-out error:', error);
    }
    setMobileSignedIn(false);
    queryClient.clear();
    setLocation('/');
  }, [queryClient, setLocation]);

  const getToken = useCallback(async (): Promise<string | null> => {
    return clerkNative.getToken();
  }, []);

  // Fetch user data when signed in
  const { data: user, error, isLoading: isUserQueryLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: mobileSignedIn && mobileLoaded,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  });

  // Wait for both mobile auth check AND user data before routing
  const isLoading = !mobileLoaded || (mobileSignedIn && mobileLoaded && isUserQueryLoading);
  const isSignedIn = mobileSignedIn;
  const isAuthenticated = mobileSignedIn && !!user;

  return (
    <AuthContext.Provider value={{
      isLoading,
      isSignedIn,
      isAuthenticated,
      user: user ?? null,
      userId: (user as any)?.id ?? null,
      error: error ?? null,
      signOut,
      getToken,
      setSignedIn,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
