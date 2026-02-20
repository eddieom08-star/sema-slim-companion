import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { clerkNative } from "@/lib/clerkNative";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { setSignedIn } = useAuth();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (hasAttempted) return;
    setHasAttempted(true);

    (async () => {
      try {
        const result = await clerkNative.presentSignIn();
        if (result.success || result.isSignedIn) {
          setSignedIn(true);
          setLocation('/dashboard');
        } else {
          setLocation('/');
        }
      } catch (error) {
        console.error('[SignIn] Error:', error);
        setLocation('/');
      }
    })();
  }, [hasAttempted, setSignedIn, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto" />
        <p className="text-muted-foreground">Opening sign in...</p>
      </div>
    </div>
  );
}
