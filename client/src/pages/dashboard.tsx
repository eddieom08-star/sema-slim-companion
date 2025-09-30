import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/ui/navigation";
import { ProgressChart } from "@/components/progress-chart";
import { AchievementBadge } from "@/components/achievement-badge";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    retry: false,
  });

  const { data: streaks, isLoading: isStreaksLoading } = useQuery({
    queryKey: ["/api/streaks"],
    retry: false,
  });

  const { data: userAchievements, isLoading: isAchievementsLoading } = useQuery({
    queryKey: ["/api/user-achievements"],
    retry: false,
  });

  useEffect(() => {
    if (!isDashboardLoading && !dashboardData) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isDashboardLoading, dashboardData, toast]);

  if (isDashboardLoading || isStreaksLoading || isAchievementsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const foodTrackingStreak = (streaks as any)?.find((s: any) => s.streakType === 'food_tracking')?.currentStreak || 0;
  const weightLoggingStreak = (streaks as any)?.find((s: any) => s.streakType === 'weight_logging')?.currentStreak || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your GLP-1 journey overview for today
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-calories">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-utensils text-primary"></i>
                <span className="text-sm font-medium text-muted-foreground">Today's Calories</span>
              </div>
              <div className="text-2xl font-bold text-foreground" data-testid="text-todays-calories">
                {(dashboardData as any)?.todaysCalories || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {(dashboardData as any)?.todaysCalories < 1400 ? "On track" : "Above target"}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-weight-change">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-weight text-secondary"></i>
                <span className="text-sm font-medium text-muted-foreground">Weekly Change</span>
              </div>
              <div className="text-2xl font-bold text-foreground" data-testid="text-weekly-change">
                {(dashboardData as any)?.weeklyWeightChange > 0 ? '+' : ''}
                {(dashboardData as any)?.weeklyWeightChange?.toFixed(1) || '0.0'} lbs
              </div>
              <p className="text-xs text-muted-foreground">
                {(dashboardData as any)?.weeklyWeightChange < 0 ? "Great progress!" : "Keep going!"}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-streak">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-fire text-accent"></i>
                <span className="text-sm font-medium text-muted-foreground">Tracking Streak</span>
              </div>
              <div className="text-2xl font-bold text-foreground" data-testid="text-tracking-streak">
                {foodTrackingStreak} days
              </div>
              <p className="text-xs text-muted-foreground">
                Keep it up!
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-medication">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-syringe text-destructive"></i>
                <span className="text-sm font-medium text-muted-foreground">Next Medication</span>
              </div>
              <div className="text-lg font-bold text-foreground" data-testid="text-next-medication">
                {(dashboardData as any)?.upcomingMedication ? (
                  <>
                    {(dashboardData as any).upcomingMedication.medicationType}
                    <p className="text-xs text-muted-foreground font-normal">
                      {(dashboardData as any).upcomingMedication.dosage}
                    </p>
                  </>
                ) : (
                  "No upcoming"
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-chart-line text-primary"></i>
                  <span>Weight Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressChart />
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-trophy text-secondary"></i>
                  <span>Recent Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="achievements-list">
                  {(userAchievements as any)?.slice(0, 3).map((achievement: any, index: number) => (
                    <AchievementBadge key={achievement.id} achievement={achievement} />
                  )) || (
                    <p className="text-muted-foreground text-sm">
                      Start tracking to earn achievements!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = "/food-tracking"}
                  data-testid="button-log-food"
                >
                  <i className="fas fa-plus text-lg"></i>
                  <span>Log Food</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = "/medication"}
                  data-testid="button-log-medication"
                >
                  <i className="fas fa-syringe text-lg"></i>
                  <span>Log Medication</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = "/progress"}
                  data-testid="button-log-weight"
                >
                  <i className="fas fa-weight text-lg"></i>
                  <span>Log Weight</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
