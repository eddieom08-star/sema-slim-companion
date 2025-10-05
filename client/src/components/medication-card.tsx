import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, differenceInHours, parseISO } from "date-fns";

interface MedicationCardProps {
  medication: any;
  onQuickLog: (medicationId: string, dosage: string) => void;
  onDetailedLog: (medication: any) => void;
  isLogging: boolean;
}

export function MedicationCard({ medication, onQuickLog, onDetailedLog, isLogging }: MedicationCardProps) {
  const getTimeUntilNext = () => {
    if (!medication.nextDueDate) return null;
    
    const now = new Date();
    const dueDate = parseISO(medication.nextDueDate);
    const hoursUntil = differenceInHours(dueDate, now);
    
    if (hoursUntil < 0) {
      return { text: "Overdue", className: "text-destructive", urgent: true };
    } else if (hoursUntil < 2) {
      return { text: `Due in ${hoursUntil}h`, className: "text-accent", urgent: true };
    } else if (hoursUntil < 24) {
      return { text: `Due in ${hoursUntil}h`, className: "text-muted-foreground", urgent: false };
    } else {
      const days = Math.floor(hoursUntil / 24);
      return { text: `Due in ${days}d`, className: "text-muted-foreground", urgent: false };
    }
  };

  const getMedicationIcon = () => {
    switch (medication.medicationType) {
      case 'ozempic':
      case 'wegovy':
      case 'mounjaro':
        return 'fas fa-syringe';
      case 'rybelsus':
        return 'fas fa-pills';
      default:
        return 'fas fa-prescription-bottle-alt';
    }
  };

  const getMedicationName = () => {
    switch (medication.medicationType) {
      case 'ozempic':
        return 'Ozempic';
      case 'wegovy':
        return 'Wegovy';
      case 'mounjaro':
        return 'Mounjaro';
      case 'rybelsus':
        return 'Rybelsus';
      default:
        return medication.medicationType;
    }
  };

  const timeInfo = getTimeUntilNext();

  return (
    <Card className="card-hover" data-testid={`medication-card-${medication.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              timeInfo?.urgent ? 'bg-accent/10' : 'bg-primary/10'
            }`}>
              <i className={`${getMedicationIcon()} ${
                timeInfo?.urgent ? 'text-accent' : 'text-primary'
              } text-xl`}></i>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{getMedicationName()}</h3>
              <p className="text-sm text-muted-foreground">{medication.dosage}</p>
            </div>
          </div>
          
          {timeInfo && (
            <div className="text-right">
              <span className={`text-sm font-medium ${timeInfo.className}`}>
                {timeInfo.text}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frequency:</span>
            <span className="font-medium capitalize">{medication.frequency}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">
              {format(parseISO(medication.startDate), 'MMM d, yyyy')}
            </span>
          </div>

          {medication.nextDueDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next due:</span>
              <span className="font-medium">
                {format(parseISO(medication.nextDueDate), 'MMM d, h:mm a')}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <Button
            onClick={() => onQuickLog(medication.id, medication.dosage)}
            disabled={isLogging}
            className="w-full"
            data-testid={`button-quick-log-${medication.id}`}
          >
            {isLogging ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Logging...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Quick Log
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onDetailedLog(medication)}
            data-testid={`button-detailed-log-${medication.id}`}
          >
            <i className="fas fa-edit mr-2"></i>
            Detailed Log
          </Button>
        </div>

        {medication.reminderEnabled && (
          <div className="mt-4 flex items-center space-x-2 text-xs text-muted-foreground">
            <i className="fas fa-bell"></i>
            <span>Reminders enabled</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
