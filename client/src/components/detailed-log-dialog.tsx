import { useEffect } from "react";
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
  nausea: z.number().min(0).max(5).optional(),
  vomiting: z.number().min(0).max(5).optional(),
  diarrhea: z.number().min(0).max(5).optional(),
  constipation: z.number().min(0).max(5).optional(),
  heartburn: z.number().min(0).max(5).optional(),
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
  const form = useForm<DetailedLogFormData>({
    resolver: zodResolver(detailedLogSchema),
    defaultValues: {
      medicationId: "",
      dosage: "",
      takenAt: new Date().toISOString().slice(0, 16),
      notes: "",
      nausea: 0,
      vomiting: 0,
      diarrhea: 0,
      constipation: 0,
      heartburn: 0,
    },
  });

  useEffect(() => {
    if (open && medicationId && dosage) {
      form.reset({
        medicationId,
        dosage,
        takenAt: new Date().toISOString().slice(0, 16),
        notes: "",
        nausea: 0,
        vomiting: 0,
        diarrhea: 0,
        constipation: 0,
        heartburn: 0,
      });
    }
  }, [open, medicationId, dosage, form]);

  const handleSubmit = (data: DetailedLogFormData) => {
    onSubmit(data);
  };

  const nauseaValue = form.watch("nausea") || 0;
  const vomitingValue = form.watch("vomiting") || 0;
  const diarrheaValue = form.watch("diarrhea") || 0;
  const constipationValue = form.watch("constipation") || 0;
  const heartburnValue = form.watch("heartburn") || 0;

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
              name="medicationId"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

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

            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
              <div>
                <h3 className="text-sm font-semibold mb-1">Side Effects</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Track common GLP-1 side effects to share with your healthcare provider
                </p>
              </div>

              <FormField
                control={form.control}
                name="nausea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Nausea</span>
                      <span className="text-sm font-medium">
                        {nauseaValue}/5
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[field.value || 0]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                        data-testid="slider-nausea"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vomiting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Vomiting</span>
                      <span className="text-sm font-medium">
                        {vomitingValue}/5
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[field.value || 0]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                        data-testid="slider-vomiting"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diarrhea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Diarrhea</span>
                      <span className="text-sm font-medium">
                        {diarrheaValue}/5
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[field.value || 0]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                        data-testid="slider-diarrhea"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="constipation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Constipation</span>
                      <span className="text-sm font-medium">
                        {constipationValue}/5
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[field.value || 0]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                        data-testid="slider-constipation"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="heartburn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Heartburn</span>
                      <span className="text-sm font-medium">
                        {heartburnValue}/5
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[field.value || 0]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="w-full"
                        data-testid="slider-heartburn"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
