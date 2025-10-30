import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NotificationCenter, useUnreadNotificationsCount } from "@/components/notification-center";

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { signOut } = useClerk();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const unreadCount = useUnreadNotificationsCount();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Clerk automatically saves all session data and ensures clean logout
      await signOut({ redirectUrl: "/" });
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: "fas fa-tachometer-alt" },
    { path: "/food-tracking", label: "Food", icon: "fas fa-utensils" },
    { path: "/medication", label: "Medication", icon: "fas fa-syringe" },
    { path: "/recipes", label: "Recipes", icon: "fas fa-book" },
    { path: "/progress", label: "Progress", icon: "fas fa-chart-line" },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
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

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                // Dashboard should be active for both /dashboard and / (which redirects to /dashboard)
                const isActive = location === item.path || (item.path === "/dashboard" && location === "/");
                return (
                  <Link key={item.path} href={item.path}>
                    <a
                      className={`text-sm font-medium transition-colors flex items-center space-x-2 ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase()}`}
                    >
                      <i className={item.icon}></i>
                      <span>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-lg hover:bg-muted transition-colors relative"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                data-testid="button-notifications"
              >
                <i className="fas fa-bell text-muted-foreground"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center" data-testid="badge-unread-count">
                    {unreadCount}
                  </span>
                )}
              </Button>

              <div className="flex items-center space-x-3">
                <Link href="/profile">
                  <a className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-profile">
                    <span className="text-xs font-medium text-primary-foreground">
                      {(user as any)?.firstName?.[0] || (user as any)?.email?.[0] || 'U'}
                    </span>
                  </a>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hidden md:flex text-sm text-muted-foreground hover:text-foreground"
                  data-testid="button-logout"
                >
                  {isLoggingOut ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Logging out...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-out-alt mr-2"></i>
                      Logout
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <NotificationCenter
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      </header>

      {/* Bottom Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            // Dashboard should be active for both /dashboard and / (which redirects to /dashboard)
            const isActive = location === item.path || (item.path === "/dashboard" && location === "/");
            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <i className={`${item.icon} text-xl mb-1`}></i>
                  <span className="text-xs font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for bottom navigation on mobile */}
      <div className="md:hidden h-16" />
    </>
  );
}
