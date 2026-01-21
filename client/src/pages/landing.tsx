import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { clerkNative } from "@/lib/clerkNative";
import { useEffect, useState } from "react";
import { useAuthNative, setNativeAuthSignedIn } from "@/hooks/useAuthNative";

/**
 * Wait for Clerk session token to be available after sign-in
 * The native SDK sometimes needs a moment to sync after presentSignIn returns
 */
async function waitForSessionToken(maxAttempts = 10, delayMs = 500): Promise<boolean> {
  console.log('[Landing] Waiting for session token to be available...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const token = await clerkNative.getToken();
      if (token) {
        console.log(`[Landing] Session token available after ${i + 1} attempt(s)`);
        return true;
      }
    } catch (error) {
      console.log(`[Landing] Token attempt ${i + 1} failed:`, error);
    }
    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  console.warn('[Landing] Session token not available after max attempts');
  return false;
}

/**
 * Landing Page - Marketing site for unauthenticated users
 *
 * Auto-redirects to dashboard if user is already signed in.
 */
export default function Landing() {
  const [, setLocation] = useLocation();
  const isMobile = Capacitor.isNativePlatform();
  const { isSignedIn, isLoading } = useAuthNative();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Auto-redirect to dashboard if already signed in
  useEffect(() => {
    if (isMobile && !isLoading && isSignedIn) {
      console.log('[Landing] User is signed in, redirecting to dashboard');
      setLocation('/dashboard');
    }
  }, [isMobile, isLoading, isSignedIn, setLocation]);

  // Show loading state while checking auth on mobile (prevents flash of landing page)
  if (isMobile && isLoading) {
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
    console.log('[Landing] Sign In clicked');

    if (isMobile) {
      setIsSigningIn(true);
      try {
        // Check if already signed in first to avoid "already signed in" error
        const authStatus = await clerkNative.isSignedIn();
        if (authStatus.isSignedIn) {
          console.log('[Landing] Already signed in, setting state and redirecting');
          setNativeAuthSignedIn(true);
          setLocation('/dashboard');
          return;
        }

        const result = await clerkNative.presentSignIn();
        console.log('[Landing] Sign-in result:', result);

        if (result.success || result.isSignedIn) {
          console.log('[Landing] Sign-in successful, waiting for session to be ready...');

          // CRITICAL: Wait for the session token to be available before navigating
          // The Clerk SDK sometimes needs a moment to sync after sign-in
          const tokenReady = await waitForSessionToken();

          if (tokenReady) {
            console.log('[Landing] Session ready, navigating to dashboard');
            // Set signed-in state directly using exported function
            setNativeAuthSignedIn(true);
            // Navigate to dashboard
            setLocation('/dashboard');
          } else {
            console.error('[Landing] Session token not available after sign-in');
            alert('Sign-in completed but session sync failed. Please try again.');
          }
        } else {
          console.log('[Landing] Sign-in cancelled');
        }
      } catch (error) {
        console.error('[Landing] Sign-in error:', error);
        alert(`Sign-in failed: ${(error as Error).message}`);
      } finally {
        setIsSigningIn(false);
      }
    } else {
      // Web: Navigate to sign-in page
      setLocation('/sign-in');
    }
  };

  const handleSignUpClick = async () => {
    console.log('[Landing] Sign Up clicked');

    if (isMobile) {
      setIsSigningIn(true);
      try {
        // Check if already signed in first to avoid "already signed in" error
        const authStatus = await clerkNative.isSignedIn();
        if (authStatus.isSignedIn) {
          console.log('[Landing] Already signed in, setting state and redirecting');
          setNativeAuthSignedIn(true);
          setLocation('/dashboard');
          return;
        }

        const result = await clerkNative.presentSignUp();
        console.log('[Landing] Sign-up result:', result);

        if (result.success || result.isSignedIn) {
          console.log('[Landing] Sign-up successful, waiting for session to be ready...');

          // CRITICAL: Wait for the session token to be available before navigating
          // The Clerk SDK sometimes needs a moment to sync after sign-up
          const tokenReady = await waitForSessionToken();

          if (tokenReady) {
            console.log('[Landing] Session ready, navigating to dashboard');
            // Set signed-in state directly using exported function
            setNativeAuthSignedIn(true);
            // Navigate to dashboard
            setLocation('/dashboard');
          } else {
            console.error('[Landing] Session token not available after sign-up');
            alert('Sign-up completed but session sync failed. Please try again.');
          }
        } else {
          console.log('[Landing] Sign-up cancelled');
        }
      } catch (error) {
        console.error('[Landing] Sign-up error:', error);
        alert(`Sign-up failed: ${(error as Error).message}`);
      } finally {
        setIsSigningIn(false);
      }
    } else {
      // Web: Navigate to sign-up page
      setLocation('/sign-up');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-heartbeat text-primary-foreground text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SemaSlim</h1>
                <p className="text-xs text-muted-foreground">GLP-1 Weight Management</p>
              </div>
            </div>

            <Button
              onClick={handleSignInClick}
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-bg text-primary-foreground py-8 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight text-black">
                  Optimize Your<br />
                  <span className="text-black">GLP-1 Journey</span>
                </h2>
                <p className="text-base sm:text-xl text-black leading-relaxed">
                  The only weight management app designed specifically for semaglutide users. Track nutrition, manage medications, and achieve sustainable results.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleSignUpClick}
                  className="bg-card text-primary px-8 py-4 rounded-lg font-semibold hover:bg-card/90 transition-colors"
                >
                  Start Free Trial
                </Button>
                <Button
                  onClick={handleSignUpClick}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Try it for Free
                </Button>
              </div>

              <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-8 pt-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-black">500K+</div>
                  <div className="text-xs sm:text-sm text-black">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-black">4.9★</div>
                  <div className="text-xs sm:text-sm text-black">App Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-black">18 lbs</div>
                  <div className="text-xs sm:text-sm text-black">Avg. Loss</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Medication Plans */}
      <section className="py-8 sm:py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Plans for Every GLP-1 User</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Specialized tracking and support for your specific semaglutide medication
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: "fas fa-syringe",
                name: "Ozempic",
                description: "Weekly injection tracking with dosage escalation schedule",
                features: ["Weekly reminders", "Side effect tracking", "Dose progression"]
              },
              {
                icon: "fas fa-pills",
                name: "Mounjaro",
                description: "Dual-action GIP/GLP-1 medication management",
                features: ["Injection tracking", "Enhanced metabolism", "Appetite monitoring"]
              },
              {
                icon: "fas fa-weight",
                name: "Wegovy",
                description: "Higher-dose semaglutide for weight management",
                features: ["Weight-focused tracking", "Progress monitoring", "Lifestyle coaching"]
              },
              {
                icon: "fas fa-tablet-alt",
                name: "Rybelsus",
                description: "Oral semaglutide with daily tracking",
                features: ["Daily pill reminders", "Timing optimization", "Food interactions"]
              }
            ].map((plan, index) => (
              <Card key={index} className="card-hover">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <i className={`${plan.icon} text-accent text-xl`}></i>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <i className="fas fa-check text-secondary w-4 mr-2"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold">Ready to Optimize Your GLP-1 Journey?</h2>
              <p className="text-base sm:text-xl text-primary-foreground/90 leading-relaxed">
                Join 500,000+ users who've transformed their weight loss journey with SemaSlim.
                Start your free trial today and see the difference specialized GLP-1 support makes.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleSignUpClick}
                className="bg-card text-primary px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-card/90 transition-colors w-full sm:w-auto sm:min-w-48"
              >
                Start Free 14-Day Trial
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4 text-xs sm:text-sm text-primary-foreground/80">
              <div className="flex items-center space-x-2">
                <i className="fas fa-shield-alt"></i>
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-mobile-alt"></i>
                <span>iOS & Android</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-credit-card"></i>
                <span>No Card Required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-heartbeat text-primary-foreground"></i>
              </div>
              <div>
                <h3 className="font-bold text-foreground">SemaSlim</h3>
                <p className="text-xs text-muted-foreground">GLP-1 Weight Management</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
              The comprehensive weight management platform designed specifically for semaglutide medication users.
            </p>
            <p className="text-xs text-muted-foreground">
              © 2024 SemaSlim. All rights reserved. FDA Disclaimer: This app is not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
