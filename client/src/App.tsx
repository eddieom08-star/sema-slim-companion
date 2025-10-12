import { Switch, Route } from "wouter";
import { queryClient, setAuthTokenGetter } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
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
import { Redirect } from "@/components/redirect";

/**
 * Router component with simplified auth flow
 *
 * PHASE 1 CLEANUP:
 * - Removed 3-second error delay band-aid
 * - Removed showError state
 * - Simplified to just show loading while auth is in progress
 * - Let error boundaries handle actual errors
 */
function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while Clerk or database user is loading
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

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          {/* Not authenticated: show landing page */}
          <Route path="/" component={Landing} />
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
              {/* Authenticated and onboarded: show app */}
              <Route path="/" component={() => <Redirect to="/dashboard" />} />
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
