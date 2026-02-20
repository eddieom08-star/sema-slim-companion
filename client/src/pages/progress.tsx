import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import { ProgressChart } from "@/components/progress-chart";
import { AchievementBadge } from "@/components/achievement-badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Progress() {
  const [weightInput, setWeightInput] = useState("");
  const [weightNotes, setWeightNotes] = useState("");
  const [selectedWeightLog, setSelectedWeightLog] = useState<any>(null);
  const [isViewLogDialogOpen, setIsViewLogDialogOpen] = useState(false);
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

  const isLoading = weightLogsLoading || achievementsLoading || streaksLoading || isProfileLoading;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8 overflow-x-hidden">
        <Navigation />
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
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
    <div className="min-h-screen bg-background pb-20 md:pb-8 overflow-x-hidden">
      <Navigation />

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Progress Tracking</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor your weight loss journey and celebrate your achievements
          </p>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card data-testid="card-current-weight">
            <CardContent className="p-4 md:p-6 text-center">
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
            <CardContent className="p-4 md:p-6 text-center">
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
            <CardContent className="p-4 md:p-6 text-center">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Weight Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-chart-line text-primary"></i>
                  <span>Weight Progress Chart</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <ProgressChart />
              </CardContent>
            </Card>

            {/* Recent Weight Logs */}
            <Card className="mt-6 md:mt-8">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-history text-secondary"></i>
                  <span>Recent Weight Logs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4" data-testid="recent-weight-logs">
                  {(weightLogs as any) && (weightLogs as any).length > 0 ? (
                    (weightLogs as any).slice(0, 10).map((log: any, index: number) => {
                      const prevLog = (weightLogs as any)[index + 1];
                      const change = prevLog ? Number(log.weight) - Number(prevLog.weight) : 0;
                      
                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedWeightLog(log);
                            setIsViewLogDialogOpen(true);
                          }}
                        >
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
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {log.notes}
                              </p>
                            )}
                          </div>
                          <i className="fas fa-chevron-right text-muted-foreground ml-4"></i>
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
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-plus text-secondary"></i>
                  <span>Log Weight</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
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
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-trophy text-accent"></i>
                  <span>Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
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

      {/* Weight Log Details Dialog */}
      <Dialog open={isViewLogDialogOpen} onOpenChange={setIsViewLogDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <i className="fas fa-weight text-primary"></i>
              <span>Weight Log Details</span>
            </DialogTitle>
          </DialogHeader>

          {selectedWeightLog && (
            <div className="space-y-4 pt-4">
              {/* Weight Value */}
              <div className="border border-border rounded-lg p-4 text-center bg-primary/5">
                <div className="text-4xl font-bold text-primary mb-2">
                  {Number(selectedWeightLog.weight).toFixed(1)} lbs
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedWeightLog.loggedAt), 'EEEE, MMM d, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedWeightLog.loggedAt), 'h:mm a')}
                </div>
              </div>

              {/* Weight Change */}
              {(() => {
                const logIndex = (weightLogs as any)?.findIndex((log: any) => log.id === selectedWeightLog.id);
                const prevLog = logIndex !== -1 && logIndex < (weightLogs as any).length - 1
                  ? (weightLogs as any)[logIndex + 1]
                  : null;
                const change = prevLog ? Number(selectedWeightLog.weight) - Number(prevLog.weight) : null;

                return change !== null && change !== 0 ? (
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Change from previous entry</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-bold ${change < 0 ? 'text-secondary' : 'text-destructive'}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)} lbs
                        </span>
                        <i className={`fas ${change < 0 ? 'fa-arrow-down text-secondary' : 'fa-arrow-up text-destructive'}`}></i>
                      </div>
                    </div>
                    {prevLog && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Previous: {Number(prevLog.weight).toFixed(1)} lbs on {format(new Date(prevLog.loggedAt), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Notes */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <i className="fas fa-sticky-note text-accent"></i>
                  <span className="font-semibold text-foreground">Notes</span>
                </div>
                {selectedWeightLog.notes ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedWeightLog.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No notes recorded for this entry
                  </p>
                )}
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setIsViewLogDialogOpen(false)}
                className="w-full"
                variant="outline"
              >
                <i className="fas fa-times mr-2"></i>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
