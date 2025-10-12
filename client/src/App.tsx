import { Switch, Route } from "wouter";
import { queryClient, setAuthTokenGetter } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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

function Router() {
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const [showError, setShowError] = useState(false);

  // Only show error screen if error persists for more than 3 seconds
  // This allows retry logic to complete without showing error prematurely
  useEffect(() => {
    if (error && clerkLoaded && isSignedIn && !user) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 3000); // Wait 3 seconds before showing error
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [error, clerkLoaded, isSignedIn, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show authentication error if showError is true (set after 3 second delay)
  // This gives retry logic time to complete before showing error screen
  if (showError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto">
            <i className="fas fa-exclamation-triangle text-destructive text-xl"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Authentication Error</h2>
            <p className="text-sm text-muted-foreground">
              We encountered an issue loading your account. This usually resolves by signing in again.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/:any*" component={Landing} />
        </>
      ) : (
        <>
          {user && !(user as any).onboardingCompleted ? (
            <>
              <Route path="/" component={Onboarding} />
              <Route path="/:any*" component={Onboarding} />
            </>
          ) : (
            <>
              <Route path="/" component={Dashboard} />
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
  const { getToken } = useClerkAuth();

  // Inject the Clerk token getter into the query client
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

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
