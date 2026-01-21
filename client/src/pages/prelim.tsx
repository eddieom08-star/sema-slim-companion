import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

/**
 * Prelim Page - Intermediate page after successful login
 *
 * PURPOSE: Avoids race condition with auth state propagation.
 * User lands here after login, sees encouraging message, clicks "Let's go"
 * to proceed to dashboard. By then, global auth state has caught up.
 *
 * ROLLBACK: Delete this file and revert landing.tsx redirects to /dashboard
 */
export default function Prelim() {
  const [, setLocation] = useLocation();

  const handleLetsGo = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 safe-area-inset">
      {/* Logo */}
      <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-8 shadow-lg">
        <i className="fas fa-heartbeat text-primary-foreground text-4xl"></i>
      </div>

      {/* Encouraging message */}
      <div className="text-center max-w-sm mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Welcome to SemaSlim!
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          You're on your way to a healthier you.
        </p>
        <p className="text-muted-foreground">
          Track your GLP-1 journey, log your progress, and celebrate every milestone.
        </p>
      </div>

      {/* Let's go button */}
      <Button
        onClick={handleLetsGo}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white text-xl px-12 py-6 rounded-full shadow-lg animate-pulse"
        style={{ touchAction: 'manipulation' }}
        data-testid="button-lets-go"
      >
        Let's go!
      </Button>

      {/* Subtle footer */}
      <p className="text-sm text-muted-foreground mt-12">
        Your health journey starts now
      </p>
    </div>
  );
}
