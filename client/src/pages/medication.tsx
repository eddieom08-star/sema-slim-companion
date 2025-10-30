import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navigation from "@/components/ui/navigation";
import { MedicationCard } from "@/components/medication-card";
import { MedicationForm } from "@/components/medication-form";
import { DetailedLogDialog } from "@/components/detailed-log-dialog";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Medication() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailedLogOpen, setIsDetailedLogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isViewLogDialogOpen, setIsViewLogDialogOpen] = useState(false);

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
      setIsDetailedLogOpen(false);
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
      nausea: 0,
      vomiting: 0,
      diarrhea: 0,
      constipation: 0,
      heartburn: 0,
    });
  };

  const handleDetailedLog = (medication: any) => {
    setSelectedMedication(medication);
    setIsDetailedLogOpen(true);
  };

  const handleDetailedLogSubmit = (data: any) => {
    logMedication.mutate({
      medicationId: data.medicationId,
      takenAt: new Date(data.takenAt).toISOString(),
      dosage: data.dosage,
      notes: data.notes || "",
      nausea: data.nausea || 0,
      vomiting: data.vomiting || 0,
      diarrhea: data.diarrhea || 0,
      constipation: data.constipation || 0,
      heartburn: data.heartburn || 0,
    });
  };

  if (medicationsLoading || logsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
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
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Medication Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track your GLP-1 medications, dosages, and side effects
          </p>
        </div>

        {/* Active Medications */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Active Medications</h2>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-medication-header">
              <i className="fas fa-plus mr-2"></i>
              Add Medication
            </Button>
          </div>

          {(medications as any) && (medications as any).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {(medications as any).map((medication: any) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  onQuickLog={handleQuickLog}
                  onDetailedLog={handleDetailedLog}
                  isLogging={logMedication.isPending}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <i className="fas fa-prescription-bottle-alt text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-semibold text-foreground mb-2">No medications added</h3>
                <p className="text-muted-foreground mb-4">
                  Add your GLP-1 medication to start tracking your doses and progress.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-medication">
                  <i className="fas fa-plus mr-2"></i>
                  Add Medication
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-history text-primary"></i>
                <span>Recent Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4" data-testid="recent-medication-logs">
                {(medicationLogs as any) && (medicationLogs as any).length > 0 ? (
                  (medicationLogs as any).slice(0, 5).map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedLog(log);
                        setIsViewLogDialogOpen(true);
                      }}
                    >
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
                        {(log.nausea > 0 || log.vomiting > 0 || log.diarrhea > 0 || log.constipation > 0 || log.heartburn > 0) && (
                          <p className="text-xs text-destructive mt-1">
                            <i className="fas fa-exclamation-triangle mr-1"></i>
                            Side effects recorded
                          </p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            <i className="fas fa-sticky-note mr-1"></i>
                            {log.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-chevron-right text-muted-foreground text-sm"></i>
                      </div>
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
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-exclamation-triangle text-secondary"></i>
                <span>Side Effects</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
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

                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={() => {
                    const firstMedication = (medications as any)?.[0];
                    if (firstMedication) {
                      handleDetailedLog(firstMedication);
                    } else {
                      toast({
                        title: "No medication found",
                        description: "Please add a medication first.",
                        variant: "destructive",
                      });
                    }
                  }}
                  data-testid="button-log-side-effects"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Log Side Effects
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MedicationForm open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <DetailedLogDialog
        open={isDetailedLogOpen}
        onOpenChange={setIsDetailedLogOpen}
        onSubmit={handleDetailedLogSubmit}
        medicationId={selectedMedication?.id}
        dosage={selectedMedication?.dosage}
        isPending={logMedication.isPending}
      />

      {/* View Log Dialog */}
      <Dialog open={isViewLogDialogOpen} onOpenChange={setIsViewLogDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medication Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Dosage and Medication Type */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-syringe text-primary"></i>
                  <span className="font-semibold text-foreground">Dosage</span>
                </div>
                <p className="text-lg font-bold text-foreground">{selectedLog.dosage}</p>
                {selectedLog.medicationType && (
                  <p className="text-sm text-muted-foreground capitalize mt-1">
                    {selectedLog.medicationType}
                  </p>
                )}
              </div>

              {/* Date and Time */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="fas fa-calendar text-secondary"></i>
                  <span className="font-semibold text-foreground">Taken At</span>
                </div>
                <p className="text-sm text-foreground">
                  {format(new Date(selectedLog.takenAt), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedLog.takenAt), 'h:mm a')}
                </p>
              </div>

              {/* Notes */}
              {selectedLog.notes && (
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="fas fa-sticky-note text-accent"></i>
                    <span className="font-semibold text-foreground">Notes</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedLog.notes}</p>
                </div>
              )}

              {/* Side Effect Ratings - Always show */}
              <div className={`border rounded-lg p-4 ${
                (selectedLog.nausea > 0 || selectedLog.vomiting > 0 || selectedLog.diarrhea > 0 || selectedLog.constipation > 0 || selectedLog.heartburn > 0)
                  ? 'border-destructive/20 bg-destructive/5'
                  : 'border-border'
              }`}>
                <div className="flex items-center space-x-2 mb-3">
                  <i className={`fas fa-exclamation-triangle ${
                    (selectedLog.nausea > 0 || selectedLog.vomiting > 0 || selectedLog.diarrhea > 0 || selectedLog.constipation > 0 || selectedLog.heartburn > 0)
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}></i>
                  <span className="font-semibold text-foreground">Side Effects</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-dizzy text-xs text-muted-foreground"></i>
                      <span className="text-sm text-foreground">Nausea</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedLog.nausea > 0 ? 'bg-destructive' : 'bg-muted-foreground/20'}`}
                          style={{ width: `${(selectedLog.nausea / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{selectedLog.nausea || 0}/5</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-head-side-cough text-xs text-muted-foreground"></i>
                      <span className="text-sm text-foreground">Vomiting</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedLog.vomiting > 0 ? 'bg-destructive' : 'bg-muted-foreground/20'}`}
                          style={{ width: `${(selectedLog.vomiting / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{selectedLog.vomiting || 0}/5</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-toilet text-xs text-muted-foreground"></i>
                      <span className="text-sm text-foreground">Diarrhea</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedLog.diarrhea > 0 ? 'bg-destructive' : 'bg-muted-foreground/20'}`}
                          style={{ width: `${(selectedLog.diarrhea / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{selectedLog.diarrhea || 0}/5</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-stomach text-xs text-muted-foreground"></i>
                      <span className="text-sm text-foreground">Constipation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedLog.constipation > 0 ? 'bg-destructive' : 'bg-muted-foreground/20'}`}
                          style={{ width: `${(selectedLog.constipation / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{selectedLog.constipation || 0}/5</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-fire text-xs text-muted-foreground"></i>
                      <span className="text-sm text-foreground">Heartburn</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${selectedLog.heartburn > 0 ? 'bg-destructive' : 'bg-muted-foreground/20'}`}
                          style={{ width: `${(selectedLog.heartburn / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-foreground w-10 text-right">{selectedLog.heartburn || 0}/5</span>
                    </div>
                  </div>
                </div>

                {!(selectedLog.nausea > 0 || selectedLog.vomiting > 0 || selectedLog.diarrhea > 0 || selectedLog.constipation > 0 || selectedLog.heartburn > 0) && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    No side effects reported
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsViewLogDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
