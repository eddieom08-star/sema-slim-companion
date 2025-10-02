import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MedicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MedicationForm({ open, onOpenChange }: MedicationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    medicationType: "",
    dosage: "",
    frequency: "",
    startDate: new Date().toISOString().split('T')[0],
  });

  const createMedication = useMutation({
    mutationFn: async (data: any) => {
      const nextDueDate = new Date(data.startDate);
      if (data.frequency === 'weekly') {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else {
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      }
      
      await apiRequest("POST", "/api/medications", {
        ...data,
        nextDueDate: nextDueDate.toISOString(),
        reminderEnabled: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
      toast({
        title: "Medication added",
        description: "Your medication has been added successfully.",
      });
      onOpenChange(false);
      setFormData({
        medicationType: "",
        dosage: "",
        frequency: "",
        startDate: new Date().toISOString().split('T')[0],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMedication.mutate(formData);
  };

  const medicationTypes = [
    { value: "ozempic", label: "Ozempic", dosages: ["0.25mg", "0.5mg", "1mg", "2mg"] },
    { value: "wegovy", label: "Wegovy", dosages: ["0.25mg", "0.5mg", "1mg", "1.7mg", "2.4mg"] },
    { value: "mounjaro", label: "Mounjaro", dosages: ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"] },
    { value: "rybelsus", label: "Rybelsus", dosages: ["3mg", "7mg", "14mg"] },
  ];

  const selectedMedicationType = medicationTypes.find(m => m.value === formData.medicationType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-add-medication">
        <DialogHeader>
          <DialogTitle>Add Medication</DialogTitle>
          <DialogDescription>
            Add your GLP-1 medication to track doses and reminders
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="medicationType">Medication Type</Label>
            <Select
              value={formData.medicationType}
              onValueChange={(value) => setFormData({ ...formData, medicationType: value, dosage: "" })}
            >
              <SelectTrigger data-testid="select-medication-type">
                <SelectValue placeholder="Select medication" />
              </SelectTrigger>
              <SelectContent>
                {medicationTypes.map((med) => (
                  <SelectItem key={med.value} value={med.value}>
                    {med.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dosage">Dosage</Label>
            <Select
              value={formData.dosage}
              onValueChange={(value) => setFormData({ ...formData, dosage: value })}
              disabled={!formData.medicationType}
            >
              <SelectTrigger data-testid="select-dosage">
                <SelectValue placeholder="Select dosage" />
              </SelectTrigger>
              <SelectContent>
                {selectedMedicationType?.dosages.map((dosage) => (
                  <SelectItem key={dosage} value={dosage}>
                    {dosage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger data-testid="select-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              data-testid="input-start-date"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.medicationType || !formData.dosage || !formData.frequency || createMedication.isPending}
              className="flex-1"
              data-testid="button-submit-medication"
            >
              {createMedication.isPending ? "Adding..." : "Add Medication"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
