import { useEffect } from "react";
import { useLocation } from "wouter";

interface RedirectProps {
  to: string;
}

/**
 * Simple redirect component that navigates to a different route
 * Used for handling authenticated user redirects
 */
export function Redirect({ to }: RedirectProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);

  // Show nothing while redirecting
  return null;
}
