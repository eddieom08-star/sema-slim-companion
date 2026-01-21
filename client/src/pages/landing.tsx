import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { useUser } from "@clerk/clerk-react"; // DISABLED - Using native SDK
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { clerkNative } from "@/lib/clerkNative";

/**
 * Landing Page - Marketing site for unauthenticated users
 *
 * NATIVE AUTH ONLY:
 * - Uses ClerkNative plugin for authentication state
 * - No web-based Clerk React hooks
 * - Direct native sign-in/sign-up calls
 * - Optimized for mobile-first experience
 */
export default function Landing() {
  const [, setLocation] = useLocation();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [forceLoaded, setForceLoaded] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = Capacitor.isNativePlatform();

  // Check native auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await clerkNative.isSignedIn();
        setIsSignedIn(result.isSignedIn);
        setIsLoaded(true);
      } catch (error) {
        console.error('[SemaSlim Landing] Auth check error:', error);
        setIsLoaded(true);
      }
    };

    checkAuth();
  }, []);

  // NOTE: Redirect handled by App.tsx router
  // Landing page should not be accessible when authenticated
  // If you see this page while signed in, there's a routing issue in App.tsx

  // Mobile fix: Force show sign in button after timeout
  useEffect(() => {
    if (isMobile && !isLoaded) {
      console.log('[SemaSlim Landing] Auth not loaded yet, starting timeout...');

      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          console.log('[SemaSlim Landing] Auth timeout reached - forcing sign in button to show');
          setForceLoaded(true);
        }, 2000);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [isMobile, isLoaded]);

  // Log auth state changes for debugging
  useEffect(() => {
    if (isMobile) {
      console.log('[SemaSlim Landing] Auth state:', { isLoaded, isSignedIn, forceLoaded });
    }
  }, [isMobile, isLoaded, isSignedIn, forceLoaded]);

  const showAuthButton = isLoaded || forceLoaded;

  // Direct button handlers - Use native Clerk on mobile, navigate on web
  const handleSignInClick = async () => {
    console.log('[SemaSlim Landing] Sign In button clicked', {
      touchCount: touchCount + 1,
      isMobile
    });
    setTouchCount(prev => prev + 1);

    // MOBILE: Use native Clerk iOS SDK
    if (isMobile) {
      console.log('[SemaSlim Landing] Opening native Clerk sign-in');
      try {
        const result = await clerkNative.presentSignIn();
        console.log('[SemaSlim Landing] Sign-in result:', result);

        // Check if sign-in was successful - redirect to prelim page
        if ((result as any).isSignedIn) {
          console.log('[SemaSlim Landing] Sign-in successful, redirecting to prelim page');
          setLocation('/prelim');
        } else {
          console.log('[SemaSlim Landing] Sign-in cancelled or failed');
        }
      } catch (error) {
        console.error('[SemaSlim Landing] Sign-in error:', error);
        alert(`Sign-in error: ${(error as Error).message}`);
      }
    } else {
      // WEB: Navigate to sign-in page
      setLocation('/sign-in');
    }
  };

  const handleSignUpClick = async () => {
    console.log('[SemaSlim Landing] Sign Up button clicked', {
      touchCount: touchCount + 1,
      isMobile
    });
    setTouchCount(prev => prev + 1);

    // MOBILE: Use native Clerk iOS SDK
    if (isMobile) {
      console.log('[SemaSlim Landing] Opening native Clerk sign-up');
      try {
        const result = await clerkNative.presentSignUp();
        console.log('[SemaSlim Landing] Sign-up result:', result);

        // Check if sign-up was successful - redirect to prelim page
        if ((result as any).isSignedIn) {
          console.log('[SemaSlim Landing] Sign-up successful, redirecting to prelim page');
          setLocation('/prelim');
        } else {
          console.log('[SemaSlim Landing] Sign-up cancelled or failed');
        }
      } catch (error) {
        console.error('[SemaSlim Landing] Sign-up error:', error);
        alert(`Sign-up error: ${(error as Error).message}`);
      }
    } else {
      // WEB: Navigate to sign-up page
      setLocation('/sign-up');
    }
  };

  const handleDashboardClick = () => {
    console.log('[SemaSlim Landing] Dashboard button clicked');
    setLocation("/dashboard");
  };

  const handleLogoutClick = async () => {
    console.log('[SemaSlim Landing] Logout button clicked');

    if (isMobile) {
      try {
        await clerkNative.signOut();
        console.log('[SemaSlim Landing] Signed out successfully');
        // Force reload to clear all state
        window.location.reload();
      } catch (error) {
        console.error('[SemaSlim Landing] Logout error:', error);
        alert(`Logout error: ${(error as Error).message}`);
      }
    }
  };

  // Log touch events for debugging
  useEffect(() => {
    if (isMobile) {
      const logTouch = (e: TouchEvent) => {
        console.log('[SemaSlim Landing] Touch detected:', {
          type: e.type,
          touches: e.touches.length,
          target: (e.target as HTMLElement)?.tagName
        });
      };

      window.addEventListener('touchstart', logTouch);
      window.addEventListener('touchend', logTouch);

      return () => {
        window.removeEventListener('touchstart', logTouch);
        window.removeEventListener('touchend', logTouch);
      };
    }
  }, [isMobile]);

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

            {!showAuthButton ? (
              <Button disabled data-testid="button-loading">
                Loading...
              </Button>
            ) : isSignedIn ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleLogoutClick}
                  variant="outline"
                  data-testid="button-logout"
                  style={{ touchAction: 'manipulation' }}
                >
                  Log Out
                </Button>
                <Button
                  onClick={handleDashboardClick}
                  data-testid="button-dashboard"
                  style={{ touchAction: 'manipulation' }}
                >
                  Dashboard
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSignInClick}
                data-testid="button-login"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                Sign In {isMobile && touchCount > 0 && `(${touchCount})`}
              </Button>
            )}
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
                  data-testid="button-start-trial"
                  style={{ touchAction: 'manipulation' }}
                >
                  Start Free Trial
                </Button>
                <Button
                  onClick={handleSignUpClick}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  data-testid="button-view-demo"
                  style={{ touchAction: 'manipulation' }}
                >
                  Try it for Free
                </Button>
              </div>

              <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-8 pt-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-black" data-testid="text-users-count">500K+</div>
                  <div className="text-xs sm:text-sm text-black">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-black" data-testid="text-app-rating">4.9★</div>
                  <div className="text-xs sm:text-sm text-black">App Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-black" data-testid="text-avg-loss">18 lbs</div>
                  <div className="text-xs sm:text-sm text-black">Avg. Loss</div>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:flex justify-center lg:justify-end">
              <div className="relative mx-auto w-[320px]" data-testid="phone-mockup">
                {/* Phone Frame */}
                <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  {/* Phone Notch/Dynamic Island */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-gray-900 rounded-b-3xl z-10"></div>
                  
                  {/* Phone Screen */}
                  <div className="relative w-full h-[600px] bg-card rounded-[2.5rem] overflow-hidden">
                    {/* Status Bar */}
                    <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-8 text-xs text-muted-foreground z-20">
                      <span className="font-semibold">9:41</span>
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-signal text-xs"></i>
                        <i className="fas fa-wifi text-xs"></i>
                        <i className="fas fa-battery-three-quarters text-xs"></i>
                      </div>
                    </div>

                    {/* App Content */}
                    <div className="pt-12 p-6 space-y-4 h-full overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">Today's Overview</h3>
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-primary-foreground text-sm"></i>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">Calories</div>
                          <div className="text-lg font-bold text-foreground">1,247</div>
                          <div className="text-xs text-secondary">-453 remaining</div>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">Weight</div>
                          <div className="text-lg font-bold text-foreground">162.4 lbs</div>
                          <div className="text-xs text-secondary">-2.1 this week</div>
                        </div>
                      </div>
                      
                      <div className="bg-accent/10 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-syringe text-accent"></i>
                          <span className="text-sm font-medium">Medication Reminder</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Ozempic injection due in 2 hours</p>
                      </div>

                      {/* Additional preview content */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">Recent Meals</span>
                          <span className="text-xs text-primary">View All</span>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Grilled Chicken Salad</p>
                              <p className="text-xs text-muted-foreground">Lunch • 420 cal</p>
                            </div>
                            <i className="fas fa-utensils text-secondary"></i>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Greek Yogurt</p>
                              <p className="text-xs text-muted-foreground">Snack • 150 cal</p>
                            </div>
                            <i className="fas fa-utensils text-secondary"></i>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
                
                {/* Floating Elements for Visual Appeal */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
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
              <Card key={index} className="card-hover" data-testid={`card-medication-${plan.name.toLowerCase()}`}>
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
                data-testid="button-start-trial-cta"
                style={{ touchAction: 'manipulation' }}
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
