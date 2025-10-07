import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: isSignedIn,
  });

  return {
    user,
    isLoading: !clerkLoaded || (isSignedIn && userLoading),
    isAuthenticated: isSignedIn && !!user,
  };
}
