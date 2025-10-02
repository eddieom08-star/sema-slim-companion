import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { requestNotificationPermission, subscribeToWebPush } from "@/lib/pwa";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm === 'granted') {
        const subscription = await subscribeToWebPush();
        
        if (subscription) {
          await apiRequest('POST', '/api/push-subscription', {
            subscription: subscription.toJSON(),
          });

          toast({
            title: "Notifications enabled",
            description: "You'll now receive push notifications for medication reminders and updates.",
          });
        }
      } else {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings to receive reminders.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!('Notification' in window)) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <Card data-testid="notification-permission-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Notifications Enabled</CardTitle>
          </div>
          <CardDescription>
            You're receiving push notifications for reminders and updates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card data-testid="notification-permission-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellOff className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Notifications Blocked</CardTitle>
          </div>
          <CardDescription>
            To receive notifications, please enable them in your browser settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid="notification-permission-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <CardTitle className="text-lg">Enable Push Notifications</CardTitle>
        </div>
        <CardDescription>
          Get reminders for medication, achievements, and important updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleEnableNotifications}
          disabled={isSubscribing}
          data-testid="button-enable-notifications"
        >
          {isSubscribing ? 'Enabling...' : 'Enable Notifications'}
        </Button>
      </CardContent>
    </Card>
  );
}
