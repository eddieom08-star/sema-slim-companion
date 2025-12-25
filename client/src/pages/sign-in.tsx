import { SignIn } from "@clerk/clerk-react";
import { Capacitor } from "@capacitor/core";

/**
 * Dedicated Sign-In Page for Mobile
 *
 * Uses Clerk's <SignIn /> component instead of clerk.openSignIn()
 * which has better mobile/Capacitor compatibility
 */
export default function SignInPage() {
  const isMobile = Capacitor.isNativePlatform();

  console.log('[SemaSlim Sign-In] Sign-in page loaded', {
    isMobile,
    platform: Capacitor.getPlatform()
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        {isMobile && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to SemaSlim</h1>
            <p className="text-muted-foreground">Sign in to continue</p>
          </div>
        )}
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg w-full",
              formButtonPrimary: "bg-primary hover:bg-primary/90"
            }
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/dashboard"
          afterSignInUrl="/dashboard"
        />
      </div>
    </div>
  );
}
