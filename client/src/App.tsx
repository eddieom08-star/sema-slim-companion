import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { useAuth as useClerkAuth } from "@clerk/clerk-react"; // DISABLED - Using native SDK
import { useAuthNative as useAuth } from "@/hooks/useAuthNative";
import { useEffect, useState, lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ErrorBoundary } from "@/components/error-boundary";

// Lazy load pages for code splitting
const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const SignInPage = lazy(() => import("@/pages/sign-in"));
const SignUpPage = lazy(() => import("@/pages/sign-up"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const FoodTracking = lazy(() => import("@/pages/food-tracking"));
const Medication = lazy(() => import("@/pages/medication"));
const Progress = lazy(() => import("@/pages/progress"));
const Profile = lazy(() => import("@/pages/profile"));
const Recipes = lazy(() => import("@/pages/recipes"));
const MobileCheckout = lazy(() => import("@/pages/MobileCheckout"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));

// Lazy load non-critical components
const PWAInstallPrompt = lazy(() => import("@/components/pwa-install-prompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineIndicator = lazy(() => import("@/components/offline-indicator").then(m => ({ default: m.OfflineIndicator })));
const NetworkAwareIndicator = lazy(() => import("@/components/network-aware").then(m => ({ default: m.NetworkAwareIndicator })));

// Loading spinner component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

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
    <Suspense fallback={<PageLoader />}>
      <Switch key={routeKey}>
        {/* Checkout routes - accessible regardless of auth (for mobile deep linking) */}
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/checkout" component={MobileCheckout} />

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
    </Suspense>
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SubscriptionProvider>
            <Toaster />
            <Router />
            <Suspense fallback={null}>
              <PWAInstallPrompt />
              <OfflineIndicator />
              <NetworkAwareIndicator />
            </Suspense>
          </SubscriptionProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
