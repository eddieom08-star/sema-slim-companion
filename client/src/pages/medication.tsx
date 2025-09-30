import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import { MedicationCard } from "@/components/medication-card";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Medication() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: medications, isLoading: medicationsLoading } = useQuery({
    queryKey: ["/api/medications"],
  });

  const { data: medicationLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/medication-logs"],
  });

  const logMedication = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/medication-logs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medication-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Medication logged",
        description: "Your medication has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleQuickLog = (medicationId: string, dosage: string) => {
    logMedication.mutate({
      medicationId,
      takenAt: new Date().toISOString(),
      dosage,
      notes: "",
      sideEffects: "",
      sideEffectSeverity: null,
    });
  };

  if (medicationsLoading || logsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Medication Management</h1>
          <p className="text-muted-foreground">
            Track your GLP-1 medications, dosages, and side effects
          </p>
        </div>

        {/* Active Medications */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Active Medications</h2>
          
          {(medications as any) && (medications as any).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(medications as any).map((medication: any) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  onQuickLog={handleQuickLog}
                  isLogging={logMedication.isPending}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <i className="fas fa-prescription-bottle-alt text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-semibold text-foreground mb-2">No medications added</h3>
                <p className="text-muted-foreground mb-4">
                  Add your GLP-1 medication to start tracking your doses and progress.
                </p>
                <Button data-testid="button-add-medication">
                  <i className="fas fa-plus mr-2"></i>
                  Add Medication
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-history text-primary"></i>
                <span>Recent Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="recent-medication-logs">
                {(medicationLogs as any) && (medicationLogs as any).length > 0 ? (
                  (medicationLogs as any).slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <i className="fas fa-syringe text-accent text-sm"></i>
                          <span className="font-medium text-foreground">{log.dosage}</span>
                          {log.medicationType && (
                            <span className="text-sm text-muted-foreground capitalize">
                              {log.medicationType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.takenAt), 'MMM d, yyyy h:mm a')}
                        </p>
                        {log.sideEffects && (
                          <p className="text-xs text-destructive mt-1">
                            Side effects: {log.sideEffects}
                          </p>
                        )}
                      </div>
                      {log.sideEffectSeverity && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-foreground">
                            {log.sideEffectSeverity}/10
                          </div>
                          <div className="text-xs text-muted-foreground">Severity</div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-clipboard-list text-2xl mb-2"></i>
                    <p>No medication logs yet</p>
                    <p className="text-sm">Log your first dose to start tracking!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side Effects Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-exclamation-triangle text-secondary"></i>
                <span>Side Effects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Track common GLP-1 side effects to share with your healthcare provider
                </div>
                
                {/* Common side effects */}
                <div className="space-y-3">
                  {[
                    { name: 'Nausea', icon: 'fas fa-dizzy', severity: 3 },
                    { name: 'Vomiting', icon: 'fas fa-head-side-cough', severity: 1 },
                    { name: 'Diarrhea', icon: 'fas fa-toilet', severity: 2 },
                    { name: 'Constipation', icon: 'fas fa-stomach', severity: 1 },
                    { name: 'Heartburn', icon: 'fas fa-fire', severity: 2 },
                  ].map((effect) => (
                    <div key={effect.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <i className={`${effect.icon} text-muted-foreground`}></i>
                        <span className="text-sm font-medium">{effect.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-1">
                          <div 
                            className="bg-destructive h-1 rounded-full" 
                            style={{ width: `${(effect.severity / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{effect.severity}/5</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-4" data-testid="button-log-side-effects">
                  <i className="fas fa-plus mr-2"></i>
                  Log Side Effects
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
