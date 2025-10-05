import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

const detailedLogSchema = z.object({
  medicationId: z.string(),
  dosage: z.string(),
  takenAt: z.string(),
  notes: z.string().optional(),
  sideEffects: z.string().optional(),
  sideEffectSeverity: z.number().min(0).max(10).optional(),
});

type DetailedLogFormData = z.infer<typeof detailedLogSchema>;

interface DetailedLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DetailedLogFormData) => void;
  medicationId?: string;
  dosage?: string;
  isPending?: boolean;
}

export function DetailedLogDialog({
  open,
  onOpenChange,
  onSubmit,
  medicationId = "",
  dosage = "",
  isPending = false,
}: DetailedLogDialogProps) {
  const [hasSideEffects, setHasSideEffects] = useState(false);

  const form = useForm<DetailedLogFormData>({
    resolver: zodResolver(detailedLogSchema),
    defaultValues: {
      medicationId,
      dosage,
      takenAt: new Date().toISOString().slice(0, 16),
      notes: "",
      sideEffects: "",
      sideEffectSeverity: 5,
    },
  });

  const handleSubmit = (data: DetailedLogFormData) => {
    const submitData = {
      ...data,
      sideEffects: hasSideEffects ? data.sideEffects : "",
      sideEffectSeverity: hasSideEffects ? data.sideEffectSeverity : undefined,
    };
    onSubmit(submitData);
    form.reset();
    setHasSideEffects(false);
  };

  const sideEffectSeverity = form.watch("sideEffectSeverity") || 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Medication Details</DialogTitle>
          <DialogDescription>
            Record your medication dose with optional notes and side effects
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="takenAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time Taken</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      data-testid="input-taken-at"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 0.25mg, 0.5mg, 1mg"
                      {...field}
                      data-testid="input-dosage"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this dose..."
                      {...field}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-side-effects"
                  checked={hasSideEffects}
                  onChange={(e) => setHasSideEffects(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                  data-testid="checkbox-has-side-effects"
                />
                <label
                  htmlFor="has-side-effects"
                  className="text-sm font-medium cursor-pointer"
                >
                  I experienced side effects
                </label>
              </div>

              {hasSideEffects && (
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                  <FormField
                    control={form.control}
                    name="sideEffects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Side Effects Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the side effects you experienced (e.g., nausea, headache, fatigue...)"
                            {...field}
                            data-testid="input-side-effects"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sideEffectSeverity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Severity</span>
                          <span className="text-sm font-medium">
                            {sideEffectSeverity}/10
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[field.value || 5]}
                            onValueChange={(values) => field.onChange(values[0])}
                            className="w-full"
                            data-testid="slider-severity"
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Mild</span>
                          <span>Moderate</span>
                          <span>Severe</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-log"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-log">
                {isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Logging...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Log Medication
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
