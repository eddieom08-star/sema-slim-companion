import { SignUp } from "@clerk/clerk-react";
import { Capacitor } from "@capacitor/core";

/**
 * Dedicated Sign-Up Page for Mobile
 *
 * Uses Clerk's <SignUp /> component instead of clerk.openSignUp()
 * which has better mobile/Capacitor compatibility
 */
export default function SignUpPage() {
  const isMobile = Capacitor.isNativePlatform();

  console.log('[SemaSlim Sign-Up] Sign-up page loaded', {
    isMobile,
    platform: Capacitor.getPlatform()
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md">
        {isMobile && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Join SemaSlim</h1>
            <p className="text-muted-foreground">Start your GLP-1 journey today</p>
          </div>
        )}
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg w-full",
              formButtonPrimary: "bg-primary hover:bg-primary/90"
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/dashboard"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
}
