import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { clerkNative } from "@/lib/clerkNative";
import { setNativeAuthSignedIn } from "@/hooks/useAuthNative";

/**
 * Sign-In Page - Uses native Clerk SDK for authentication
 *
 * On mobile: Immediately presents native sign-in UI
 * On web: Shows loading (should redirect to web Clerk flow)
 */
export default function SignInPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = Capacitor.isNativePlatform();

  useEffect(() => {
    const handleSignIn = async () => {
      if (!isMobile) {
        console.log('[SignIn] Not on mobile platform, web auth not implemented');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[SignIn] Presenting native sign-in UI...');

        // Use native Clerk sign-in
        const result = await clerkNative.presentSignIn();

        console.log('[SignIn] Result:', result);

        if (result.success || result.isSignedIn) {
          console.log('[SignIn] Success, waiting for token...');

          // Wait for token to be available
          let tokenReady = false;
          for (let i = 0; i < 10; i++) {
            const token = await clerkNative.getToken();
            if (token) {
              tokenReady = true;
              console.log('[SignIn] Token ready after', i + 1, 'attempts');
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          if (tokenReady) {
            // Update global auth state
            setNativeAuthSignedIn(true);
            // Navigate to dashboard
            setLocation('/dashboard');
          } else {
            console.error('[SignIn] Token not available after sign-in');
            alert('Sign-in completed but session sync failed. Please try again.');
            setLocation('/');
          }
        } else {
          // User cancelled or sign-in failed - go back to landing
          console.log('[SignIn] Sign-in cancelled or failed');
          setLocation('/');
        }
      } catch (error) {
        console.error('[SignIn] Error:', error);
        setLocation('/');
      } finally {
        setIsLoading(false);
      }
    };

    handleSignIn();
  }, [isMobile, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto" />
        <p className="text-muted-foreground">
          {isLoading ? 'Opening sign in...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
