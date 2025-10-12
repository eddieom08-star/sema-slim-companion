import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useAuth() {
  const { isSignedIn, isLoaded: clerkLoaded, user: clerkUser } = useUser();

  const {
    data: user,
    isLoading: userLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: isSignedIn ? 3 : 0,  // Only retry if signed in, otherwise don't retry 401s
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: isSignedIn && clerkLoaded,  // Only fetch when signed in AND Clerk is loaded
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
  });

  // If Clerk is signed in but we have no user and not loading, trigger refetch
  // This helps recover from race conditions during initial auth
  useEffect(() => {
    if (isSignedIn && !user && !userLoading && clerkLoaded && !error) {
      const timer = setTimeout(() => {
        refetch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, user, userLoading, clerkLoaded, error, refetch]);

  return {
    user,
    isLoading: !clerkLoaded || (isSignedIn && userLoading),
    isAuthenticated: isSignedIn && !!user,
    error,  // Expose errors to UI for better error handling
  };
}
