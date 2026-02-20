import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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

function Router() {
  const { isSignedIn, isLoading, user, error, signOut } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // Signed in but profile fetch failed — show recovery instead of broken Dashboard
  if (isSignedIn && !user && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto">
            <i className="fas fa-exclamation-triangle text-destructive text-xl"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground">Connection Issue</h2>
          <p className="text-sm text-muted-foreground">
            Unable to load your profile. Check your internet connection and try again.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => signOut()}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/checkout/success" component={CheckoutSuccess} />
          <Route path="/checkout" component={MobileCheckout} />
          <Route path="/" component={Landing} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route component={Landing} />
        </Switch>
      </Suspense>
    );
  }

  if (user && !(user as any).onboardingCompleted) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/checkout/success" component={CheckoutSuccess} />
          <Route path="/checkout" component={MobileCheckout} />
          <Route path="/" component={Onboarding} />
          <Route component={Onboarding} />
        </Switch>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/checkout/success" component={CheckoutSuccess} />
        <Route path="/checkout" component={MobileCheckout} />
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/food-tracking" component={FoodTracking} />
        <Route path="/medication" component={Medication} />
        <Route path="/recipes" component={Recipes} />
        <Route path="/progress" component={Progress} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [appError, setAppError] = useState<Error | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const nonCriticalPatterns = [
        /plugin.*not implemented/i,
        /StatusBar/i,
        /SplashScreen/i,
        /Keyboard/i,
      ];

      const isNonCriticalError = (error: Error | string): boolean => {
        const message = typeof error === 'string' ? error : error?.message || '';
        return nonCriticalPatterns.some(pattern => pattern.test(message));
      };

      const handleError = (event: ErrorEvent) => {
        if (!isNonCriticalError(event.error)) {
          setAppError(event.error);
        }
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const errorMessage = reason?.message || String(reason);
        if (!isNonCriticalError(errorMessage)) {
          setAppError(new Error(errorMessage));
        }
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  if (Capacitor.isNativePlatform() && appError) {
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
        <AuthProvider>
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
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
