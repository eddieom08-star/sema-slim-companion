import { useEffect } from "react";
import { useLocation } from "wouter";

interface RedirectProps {
  to: string;
}

/**
 * Simple redirect component that navigates to a different route
 * Used for handling authenticated user redirects
 *
 * FIX: Shows loading spinner instead of blank screen during redirect
 */
export function Redirect({ to }: RedirectProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);

  // Show loading spinner while redirecting (prevents white screen flash)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
