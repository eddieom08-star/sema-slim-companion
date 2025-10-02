import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { checkOnlineStatus, setupOnlineStatusListeners } from "@/lib/pwa";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(checkOnlineStatus());
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const cleanup = setupOnlineStatusListeners(
      () => {
        setIsOnline(true);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      },
      () => {
        setIsOnline(false);
        setShowReconnected(false);
      }
    );

    return cleanup;
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md" data-testid="offline-indicator">
      <Alert variant={isOnline ? "default" : "destructive"}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <AlertDescription>
            {isOnline 
              ? "You're back online!" 
              : "You're offline. Some features may be limited."}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
