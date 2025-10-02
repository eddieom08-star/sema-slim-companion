import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { promptInstall, isStandalone } from "@/lib/pwa";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const handleInstallAvailable = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    const handleInstallComplete = () => {
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-complete', handleInstallComplete);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-complete', handleInstallComplete);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md" data-testid="pwa-install-prompt">
      <Card className="border-primary shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install SemaSlim</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Install our app for a better experience with offline support and quick access.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  data-testid="button-install-pwa"
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  data-testid="button-dismiss-install"
                >
                  Not now
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0 h-6 w-6"
              onClick={handleDismiss}
              data-testid="button-close-install"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
