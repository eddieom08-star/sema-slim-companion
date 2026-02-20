import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { clerkNative } from "@/lib/clerkNative";
import { WelcomeScreen } from "@/components/ui/onboarding-welcome-screen";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoading, setSignedIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Auto-redirect to dashboard if already signed in
  useEffect(() => {
    if (!isLoading && isSignedIn) {
      setLocation('/dashboard');
    }
  }, [isLoading, isSignedIn, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 bg-primary rounded-lg animate-pulse mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignInClick = async () => {
    setIsSigningIn(true);
    try {
      const result = await clerkNative.presentSignIn();
      if (result.success || result.isSignedIn) {
        setSignedIn(true);
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error('[Landing] Sign-in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUpClick = async () => {
    setIsSigningIn(true);
    try {
      const result = await clerkNative.presentSignUp();
      if (result.success || result.isSignedIn) {
        setSignedIn(true);
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error('[Landing] Sign-up error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <WelcomeScreen
        imageUrl="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80"
        title={
          <>
            Welcome to <span className="text-primary">SemaSlim</span>
          </>
        }
        description="The only weight management app designed specifically for GLP-1 users. Track nutrition, manage medications, and achieve sustainable results."
        buttonText="Get Started"
        onButtonClick={handleSignUpClick}
        secondaryActionText={
          <>
            Already have an account? <span className="font-semibold text-primary">Sign In</span>
          </>
        }
        onSecondaryActionClick={handleSignInClick}
        isLoading={isSigningIn}
        className="min-h-screen"
      />
    </div>
  );
}
