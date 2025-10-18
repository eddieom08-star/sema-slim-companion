import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/ui/navigation";
import { ProgressChart } from "@/components/progress-chart";
import { AppetiteChart } from "@/components/appetite-chart";
import { CaloriesChart } from "@/components/calories-chart";
import { AchievementBadge } from "@/components/achievement-badge";
import { Trophy, Zap, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const { data: gamificationData, isLoading: isGamificationLoading } = useQuery({
    queryKey: ["/api/gamification"],
    retry: false,
  });

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/auth/user"],
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
        window.location.href = "/login";
      }, 500);
    }
  }, [isDashboardLoading, dashboardData, toast]);

  if (isDashboardLoading || isStreaksLoading || isAchievementsLoading || isGamificationLoading || isProfileLoading) {
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

  // Calculate level progression
  const totalPoints = (gamificationData as any)?.totalPoints || 0;
  const currentLevel = (gamificationData as any)?.currentLevel || Math.floor(totalPoints / 100) + 1;
  const pointsForCurrentLevel = (currentLevel - 1) * 100;
  const pointsForNextLevel = currentLevel * 100;
  const pointsInCurrentLevel = Math.max(0, totalPoints - pointsForCurrentLevel);
  const pointsNeededForLevel = 100; // Always 100 points per level
  const levelProgress = Math.min(100, (pointsInCurrentLevel / pointsNeededForLevel) * 100);

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

        {/* Your Progress and Achievements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Gamification Section */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <span>Your Progress</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary" data-testid="text-total-points">
                      {totalPoints} Points
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Level Display */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground" data-testid="text-current-level">
                          Level {currentLevel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Math.max(0, pointsNeededForLevel - pointsInCurrentLevel)} points to Level {currentLevel + 1}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Level {currentLevel}</span>
                      <span>Level {currentLevel + 1}</span>
                    </div>
                    <Progress value={levelProgress} className="h-3" data-testid="progress-level" />
                    <p className="text-xs text-center text-muted-foreground">
                      {pointsInCurrentLevel}/{pointsNeededForLevel} points
                    </p>
                  </div>

                  {/* Points Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Current Points</p>
                      <p className="text-lg font-bold text-primary">{totalPoints}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Lifetime Points</p>
                      <p className="text-lg font-bold text-secondary">{(gamificationData as any)?.lifetimePoints || 0}</p>
                    </div>
                  </div>

                  {/* Earn More Points */}
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Earn points by:</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-background rounded-md">Logging food (+3)</span>
                      <span className="px-2 py-1 bg-background rounded-md">Logging weight (+5)</span>
                      <span className="px-2 py-1 bg-background rounded-md">Taking medication (+5)</span>
                      <span className="px-2 py-1 bg-background rounded-md">Tracking hunger (+5)</span>
                    </div>
                  </div>
                </div>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-calories">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-utensils text-primary"></i>
                <span className="text-sm font-medium text-muted-foreground">Calories in</span>
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

        {/* Weight Progress Chart */}
        <div className="mb-8">
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

        {/* Appetite History Chart */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-chart-line text-primary"></i>
                <span>Appetite History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AppetiteChart />
            </CardContent>
          </Card>
        </div>

        {/* Calories Chart */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-utensils text-primary"></i>
                <span>Calorie Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CaloriesChart />
            </CardContent>
          </Card>
        </div>

        {/* Health & Medication Overview */}
        {userProfile && (userProfile as any).onboardingCompleted && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-heartbeat text-primary"></i>
                  <span>Health & Medication Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Medication Info */}
                  {(userProfile as any).medicationType && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <i className="fas fa-syringe text-sm"></i>
                        <span className="text-xs font-medium uppercase">Medication</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground capitalize">
                        {(userProfile as any).medicationType}
                      </p>
                      {(userProfile as any).startDate && (
                        <p className="text-xs text-muted-foreground">
                          Started: {new Date((userProfile as any).startDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Weight Goals */}
                  {(userProfile as any).currentWeight && (userProfile as any).targetWeight && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <i className="fas fa-bullseye text-sm"></i>
                        <span className="text-xs font-medium uppercase">Weight Goal</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground">
                        {Number((userProfile as any).currentWeight).toFixed(1)} → {Number((userProfile as any).targetWeight).toFixed(1)} lbs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(Number((userProfile as any).currentWeight) - Number((userProfile as any).targetWeight)).toFixed(1)} lbs to go
                      </p>
                    </div>
                  )}

                  {/* Activity Level */}
                  {(userProfile as any).activityLevel && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <i className="fas fa-running text-sm"></i>
                        <span className="text-xs font-medium uppercase">Activity</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground capitalize">
                        {(userProfile as any).activityLevel.replace('_', ' ')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                  onClick={() => setLocation("/food-tracking")}
                  data-testid="button-log-food"
                >
                  <i className="fas fa-plus text-lg"></i>
                  <span>Log Food</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setLocation("/medication")}
                  data-testid="button-log-medication"
                >
                  <i className="fas fa-syringe text-lg"></i>
                  <span>Log Medication</span>
                </Button>
                <Button 
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setLocation("/progress")}
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
