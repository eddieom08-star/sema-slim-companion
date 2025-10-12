import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import { ProgressChart } from "@/components/progress-chart";
import { AchievementBadge } from "@/components/achievement-badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Progress() {
  const [weightInput, setWeightInput] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: weightLogs, isLoading: weightLogsLoading } = useQuery({
    queryKey: ["/api/weight-logs"],
  });

  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/user-achievements"],
  });

  const { data: streaks, isLoading: streaksLoading } = useQuery({
    queryKey: ["/api/streaks"],
  });

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const logWeight = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/weight-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/streaks"] });
      setWeightInput("");
      setWeightNotes("");
      toast({
        title: "Weight logged",
        description: "Your weight has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log weight. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightInput) return;

    logWeight.mutate({
      weight: parseFloat(weightInput).toString(),
      notes: weightNotes,
      loggedAt: new Date(),
    });
  };

  const latestWeight = (weightLogs as any)?.[0];
  const previousWeight = (weightLogs as any)?.[1];
  const weightChange = latestWeight && previousWeight 
    ? Number(latestWeight.weight) - Number(previousWeight.weight)
    : 0;

  const totalWeightLoss = (weightLogs as any) && (weightLogs as any).length > 0
    ? Number((weightLogs as any)[(weightLogs as any).length - 1].weight) - Number(latestWeight?.weight || 0)
    : 0;

  const weightLoggingStreak = (streaks as any)?.find((s: any) => s.streakType === 'weight_logging')?.currentStreak || 0;

  if (weightLogsLoading || achievementsLoading || streaksLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Progress Tracking</h1>
          <p className="text-muted-foreground">
            Monitor your weight loss journey and celebrate your achievements
          </p>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-current-weight">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-foreground mb-2">
                {latestWeight ? `${Number(latestWeight.weight).toFixed(1)} lbs` : userProfile && (userProfile as any).currentWeight ? `${Number((userProfile as any).currentWeight).toFixed(1)} lbs` : 'No data'}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Current Weight</div>
              {weightChange !== 0 && (
                <div className={`text-sm font-medium ${weightChange < 0 ? 'text-secondary' : 'text-destructive'}`}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} lbs from last entry
                </div>
              )}
              {latestWeight && (
                <div className="text-xs text-muted-foreground mt-1">
                  Logged {format(new Date(latestWeight.loggedAt), 'MMM d, yyyy')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-total-loss">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-secondary mb-2">
                {totalWeightLoss > 0 ? `${totalWeightLoss.toFixed(1)} lbs` : '0.0 lbs'}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Total Weight Loss</div>
              <div className="text-sm text-muted-foreground">
                {(weightLogs as any)?.length || 0} entries recorded
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-logging-streak">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-accent mb-2">
                {weightLoggingStreak} days
              </div>
              <div className="text-sm text-muted-foreground mb-2">Logging Streak</div>
              <div className="text-sm text-muted-foreground">
                Keep logging consistently!
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weight Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-chart-line text-primary"></i>
                  <span>Weight Progress Chart</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressChart />
              </CardContent>
            </Card>

            {/* Recent Weight Logs */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-history text-secondary"></i>
                  <span>Recent Weight Logs</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="recent-weight-logs">
                  {(weightLogs as any) && (weightLogs as any).length > 0 ? (
                    (weightLogs as any).slice(0, 10).map((log: any, index: number) => {
                      const prevLog = (weightLogs as any)[index + 1];
                      const change = prevLog ? Number(log.weight) - Number(prevLog.weight) : 0;
                      
                      return (
                        <div key={log.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <i className="fas fa-weight text-primary text-sm"></i>
                              <span className="font-medium text-foreground">
                                {Number(log.weight).toFixed(1)} lbs
                              </span>
                              {change !== 0 && (
                                <span className={`text-sm ${change < 0 ? 'text-secondary' : 'text-destructive'}`}>
                                  ({change > 0 ? '+' : ''}{change.toFixed(1)})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(log.loggedAt), 'MMM d, yyyy h:mm a')}
                            </p>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-weight text-2xl mb-2"></i>
                      <p>No weight logs yet</p>
                      <p className="text-sm">Log your first weight to start tracking!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Log Weight Form & Achievements */}
          <div className="space-y-6">
            {/* Log Weight */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-plus text-secondary"></i>
                  <span>Log Weight</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleWeightSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="Enter your weight"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      required
                      data-testid="input-weight"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="How are you feeling? Any observations?"
                      value={weightNotes}
                      onChange={(e) => setWeightNotes(e.target.value)}
                      rows={3}
                      data-testid="textarea-weight-notes"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={logWeight.isPending || !weightInput}
                    data-testid="button-log-weight"
                  >
                    {logWeight.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Logging...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Log Weight
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-trophy text-accent"></i>
                  <span>Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="achievements-list">
                  {(userAchievements as any) && (userAchievements as any).length > 0 ? (
                    (userAchievements as any).slice(0, 5).map((achievement: any) => (
                      <AchievementBadge key={achievement.id} achievement={achievement} />
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <i className="fas fa-medal text-2xl mb-2"></i>
                      <p className="text-sm">No achievements yet</p>
                      <p className="text-xs">Keep tracking to earn your first badge!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
