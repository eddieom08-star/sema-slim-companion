import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { clerkNative } from "@/lib/clerkNative";
import { setNativeAuthSignedIn } from "@/hooks/useAuthNative";

/**
 * Sign-Up Page - Uses native Clerk SDK for authentication
 *
 * On mobile: Immediately presents native sign-up UI
 * On web: Shows loading (should redirect to web Clerk flow)
 */
export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = Capacitor.isNativePlatform();

  useEffect(() => {
    const handleSignUp = async () => {
      if (!isMobile) {
        console.log('[SignUp] Not on mobile platform, web auth not implemented');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[SignUp] Presenting native sign-up UI...');

        // Use native Clerk sign-up
        const result = await clerkNative.presentSignUp();

        console.log('[SignUp] Result:', result);

        if (result.success || result.isSignedIn) {
          console.log('[SignUp] Success, waiting for token...');

          // Wait for token to be available
          let tokenReady = false;
          for (let i = 0; i < 10; i++) {
            const token = await clerkNative.getToken();
            if (token) {
              tokenReady = true;
              console.log('[SignUp] Token ready after', i + 1, 'attempts');
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
            console.error('[SignUp] Token not available after sign-up');
            alert('Sign-up completed but session sync failed. Please try again.');
            setLocation('/');
          }
        } else {
          // User cancelled or sign-up failed - go back to landing
          console.log('[SignUp] Sign-up cancelled or failed');
          setLocation('/');
        }
      } catch (error) {
        console.error('[SignUp] Error:', error);
        setLocation('/');
      } finally {
        setIsLoading(false);
      }
    };

    handleSignUp();
  }, [isMobile, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto" />
        <p className="text-muted-foreground">
          {isLoading ? 'Opening sign up...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
