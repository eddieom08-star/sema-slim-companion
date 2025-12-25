import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { useAuth as useClerkAuth } from "@clerk/clerk-react"; // DISABLED - Using native SDK
import { useAuthNative as useAuth } from "@/hooks/useAuthNative";
import { useEffect, useState, useRef } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import Dashboard from "@/pages/dashboard";
import Onboarding from "@/pages/onboarding";
import FoodTracking from "@/pages/food-tracking";
import Medication from "@/pages/medication";
import Progress from "@/pages/progress";
import Profile from "@/pages/profile";
import Recipes from "@/pages/recipes";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { OfflineIndicator } from "@/components/offline-indicator";
import { NetworkAwareIndicator } from "@/components/network-aware";
import { Redirect } from "@/components/redirect";
import { Capacitor } from "@capacitor/core";

// TEMPORARY: Bypass authentication on mobile for testing
const BYPASS_AUTH_ON_MOBILE = false;

// Debug logging helper for mobile
const mobileLog = (...args: any[]) => {
  if (Capacitor.isNativePlatform()) {
    console.log('[SemaSlim Mobile]', ...args);
  }
};

/**
 * Router component with robust mobile support
 *
 * MOBILE IMPROVEMENTS:
 * - Proper timeout handling with ref to prevent race conditions
 * - Debug logging for Safari Web Inspector
 * - Graceful fallback to landing page if auth takes too long
 * - Error boundaries to catch Clerk/network failures
 * - TEMPORARY: Authentication bypass for testing
 */
function Router() {
  const { isAuthenticated, isLoading, user, error, isSignedIn } = useAuth();
  const isMobile = Capacitor.isNativePlatform();

  // TEMPORARY: Bypass auth on mobile
  const shouldBypassAuth = isMobile && BYPASS_AUTH_ON_MOBILE;
  // Allow access if either fully authenticated OR signed in natively (for mobile fallback)
  const effectiveIsAuthenticated = shouldBypassAuth ? true : (isAuthenticated || (isMobile && isSignedIn));
  const effectiveIsLoading = shouldBypassAuth ? false : isLoading;
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Log auth bypass
  useEffect(() => {
    if (shouldBypassAuth) {
      mobileLog('AUTH BYPASS ENABLED - Skipping authentication for testing');
    }
  }, [shouldBypassAuth]);

  // Robust timeout mechanism for mobile
  useEffect(() => {
    if (isMobile && !shouldBypassAuth) {
      mobileLog('Router mounted', { isLoading, isAuthenticated, hasUser: !!user });

      // Start timeout only once when component mounts
      if (!timeoutRef.current) {
        mobileLog('Starting 3-second auth timeout...');
        timeoutRef.current = setTimeout(() => {
          mobileLog('Auth timeout reached - showing landing page');
          setHasTimedOut(true);
        }, 3000);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, []); // Empty deps - only run once on mount

  // Log auth state changes
  useEffect(() => {
    if (isMobile) {
      mobileLog('Auth state changed:', {
        isLoading,
        isAuthenticated,
        hasUser: !!user,
        hasError: !!error,
        hasTimedOut
      });
    }
  }, [isLoading, isAuthenticated, user, error, hasTimedOut, isMobile]);

  // If auth is still loading after timeout on mobile, show landing page
  if (isMobile && hasTimedOut && effectiveIsLoading && !shouldBypassAuth) {
    mobileLog('Rendering landing page (timeout + still loading)');
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/:any*" component={Landing} />
      </Switch>
    );
  }

  // Show loading spinner while auth is in progress (but only for first 3 seconds on mobile)
  if (effectiveIsLoading && !(isMobile && hasTimedOut) && !shouldBypassAuth) {
    mobileLog('Rendering loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
          {isMobile && (
            <p className="text-xs text-muted-foreground">
              {hasTimedOut ? 'Still loading...' : 'Checking authentication...'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // If there's an auth error on mobile, show landing page (unless bypassing auth)
  if (isMobile && error && !shouldBypassAuth) {
    mobileLog('Auth error detected, showing landing page:', error);
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/:any*" component={Landing} />
      </Switch>
    );
  }

  mobileLog('Rendering main router', {
    isAuthenticated: effectiveIsAuthenticated,
    hasUser: !!user,
    bypassEnabled: shouldBypassAuth
  });

  // When bypassing auth on mobile, go directly to dashboard
  if (shouldBypassAuth) {
    mobileLog('Rendering app with auth bypass - going to dashboard');
    return (
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/food-tracking" component={FoodTracking} />
        <Route path="/medication" component={Medication} />
        <Route path="/recipes" component={Recipes} />
        <Route path="/progress" component={Progress} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      {!effectiveIsAuthenticated ? (
        <>
          {/* Not authenticated: show landing page for sign in */}
          <Route path="/" component={Landing} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/:any*" component={Landing} />
        </>
      ) : (
        <>
          {user && !(user as any).onboardingCompleted ? (
            <>
              {/* Authenticated but onboarding not complete: show onboarding */}
              <Route path="/" component={Onboarding} />
              <Route path="/:any*" component={Onboarding} />
            </>
          ) : (
            <>
              {/* Authenticated: go directly to dashboard (mobile fallback - skip onboarding check if no user data) */}
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/food-tracking" component={FoodTracking} />
              <Route path="/medication" component={Medication} />
              <Route path="/recipes" component={Recipes} />
              <Route path="/progress" component={Progress} />
              <Route path="/profile" component={Profile} />
              <Route component={NotFound} />
            </>
          )}
        </>
      )}
    </Switch>
  );
}

function App() {
  // const { getToken } = useClerkAuth(); // DISABLED - Using native SDK
  const [appError, setAppError] = useState<Error | null>(null);

  // NOTE: Auth token handling is now done in native iOS SDK
  // No web-based Clerk token injection needed
  mobileLog('Using native Clerk iOS SDK for authentication');

  // Global error handler for mobile
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleError = (event: ErrorEvent) => {
        mobileLog('Global error caught:', event.error);
        setAppError(event.error);
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        mobileLog('Unhandled promise rejection:', event.reason);
        setAppError(new Error(event.reason));
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  // If there's a critical error on mobile, show landing page
  if (Capacitor.isNativePlatform() && appError) {
    mobileLog('Rendering fallback due to app error');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto">
            <i className="fas fa-exclamation-triangle text-destructive text-xl"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground">Connection Issue</h2>
          <p className="text-sm text-muted-foreground">
            We're having trouble connecting to the server. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => {
              setAppError(null);
              window.location.reload();
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <PWAInstallPrompt />
        <OfflineIndicator />
        <NetworkAwareIndicator />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
