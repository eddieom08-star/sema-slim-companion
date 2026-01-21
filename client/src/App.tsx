import { Switch, Route, useLocation } from "wouter";
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
// import { DebugPanel } from "@/components/debug-panel"; // Disabled for production
import { Redirect } from "@/components/redirect";
import { Capacitor } from "@capacitor/core";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";

// TEMPORARY: Bypass authentication on mobile for testing
const BYPASS_AUTH_ON_MOBILE = false;

// Debug logging helper for mobile with persistent storage
const debugLogs: string[] = [];
const mobileLog = (...args: any[]) => {
  if (Capacitor.isNativePlatform()) {
    const message = `[${new Date().toISOString().split('T')[1].split('.')[0]}] [SemaSlim Mobile] ${JSON.stringify(args)}`;
    console.log('[SemaSlim Mobile]', ...args);
    debugLogs.push(message);

    // Keep only last 100 logs
    if (debugLogs.length > 100) {
      debugLogs.shift();
    }

    // Store in localStorage
    try {
      localStorage.setItem('semaslim_debug_logs', JSON.stringify(debugLogs));
    } catch (e) {
      // Ignore localStorage errors
    }
  }
};

// Expose log retrieval globally for debugging
if (Capacitor.isNativePlatform()) {
  (window as any).getDebugLogs = () => {
    console.log('=== DEBUG LOGS ===');
    debugLogs.forEach(log => console.log(log));
    return debugLogs.join('\n');
  };
  (window as any).clearDebugLogs = () => {
    debugLogs.length = 0;
    localStorage.removeItem('semaslim_debug_logs');
    console.log('Debug logs cleared');
  };
}

/**
 * Simplified Router component
 *
 * LOGIC:
 * 1. Show loading while checking auth
 * 2. If not authenticated -> Landing/Sign-in pages
 * 3. If authenticated without onboarding -> Onboarding page
 * 4. If authenticated with onboarding -> App pages
 */
function Router() {
  const { isAuthenticated, isLoading, user, isSignedIn } = useAuth();
  const isMobile = Capacitor.isNativePlatform();
  const [location] = useLocation();

  // Log state for debugging
  useEffect(() => {
    if (isMobile) {
      mobileLog('Router render:', {
        location,
        isLoading,
        isSignedIn,
        isAuthenticated,
        hasUser: !!user,
      });
    }
  }, [location, isLoading, isSignedIn, isAuthenticated, user, isMobile]);

  // Mobile: Allow access with just isSignedIn (don't require user data)
  const canAccessApp = isMobile ? isSignedIn : isAuthenticated;

  // Show loading spinner while initial auth check happens
  if (isLoading) {
    mobileLog('Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine route key to force Switch re-render when auth state changes
  const routeKey = canAccessApp ? 'authenticated' : 'unauthenticated';

  // For authenticated users, check onboarding
  const needsOnboarding = canAccessApp && user && !(user as any).onboardingCompleted;

  return (
    <Switch key={routeKey}>
      {!canAccessApp ? (
        <>
          {/* Not authenticated: show auth pages */}
          <Route path="/" component={Landing} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/:any*" component={Landing} />
        </>
      ) : needsOnboarding ? (
        <>
          {/* Onboarding not complete */}
          <Route path="/" component={Onboarding} />
          <Route path="/:any*" component={Onboarding} />
        </>
      ) : (
        <>
          {/* Authenticated with onboarding complete (or no user data yet on mobile) */}
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
        <SubscriptionProvider>
          <Toaster />
          <Router />
          <PWAInstallPrompt />
          <OfflineIndicator />
          <NetworkAwareIndicator />
        </SubscriptionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
