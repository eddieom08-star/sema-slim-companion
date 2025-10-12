import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom auth hook that combines Clerk authentication with database user data
 *
 * SIMPLIFIED: Removed over-engineered retry mechanisms
 * - No manual polling with useEffect
 * - No exponential backoff
 * - Simple 2-retry policy
 */
export function useAuth() {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();

  const {
    data: user,
    isLoading: userLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isSignedIn && clerkLoaded,  // Only fetch when signed in AND Clerk is loaded
    retry: 2,  // Simple retry policy - 2 retries max
    retryDelay: 1000,  // Fixed 1s delay between retries (no exponential backoff)
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
  });

  return {
    user,
    isLoading: !clerkLoaded || (isSignedIn && userLoading),
    isAuthenticated: isSignedIn && !!user,
    error,
  };
}
