import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    medicationType: "",
    currentWeight: "",
    targetWeight: "",
    height: "",
    dateOfBirth: "",
    gender: "",
    activityLevel: "",
    startDate: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/user/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to SemaSlim!",
        description: "Your profile has been set up successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    const profileData = {
      medicationType: formData.medicationType,
      currentWeight: formData.currentWeight || null,
      targetWeight: formData.targetWeight || null,
      height: formData.height ? parseInt(formData.height) : null,
      dateOfBirth: formData.dateOfBirth || null,
      gender: formData.gender || null,
      activityLevel: formData.activityLevel || null,
      startDate: formData.startDate || null,
      onboardingCompleted: true,
    };
    updateProfileMutation.mutate(profileData);
  };

  const isStepValid = () => {
    if (step === 1) {
      return formData.medicationType && formData.startDate;
    }
    if (step === 2) {
      return formData.currentWeight && formData.targetWeight && formData.height;
    }
    if (step === 3) {
      return formData.dateOfBirth && formData.gender && formData.activityLevel;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-heartbeat text-primary-foreground text-xl"></i>
          </div>
          <CardTitle className="text-2xl">Welcome to SemaSlim</CardTitle>
          <p className="text-muted-foreground">
            Let's personalize your GLP-1 weight management journey
          </p>
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-3 h-3 rounded-full ${
                  step >= stepNumber ? "bg-primary" : "bg-muted"
                }`}
                data-testid={`progress-step-${stepNumber}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Medication Information</h3>
                <p className="text-muted-foreground">Tell us about your GLP-1 medication</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="medicationType">Which medication are you taking?</Label>
                  <Select value={formData.medicationType} onValueChange={(value) => handleInputChange("medicationType", value)}>
                    <SelectTrigger data-testid="select-medication-type">
                      <SelectValue placeholder="Select your medication" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ozempic">Ozempic (Semaglutide)</SelectItem>
                      <SelectItem value="mounjaro">Mounjaro (Tirzepatide)</SelectItem>
                      <SelectItem value="wegovy">Wegovy (Semaglutide)</SelectItem>
                      <SelectItem value="rybelsus">Rybelsus (Oral Semaglutide)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">When did you start taking this medication?</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Physical Information</h3>
                <p className="text-muted-foreground">Help us set your personalized targets</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentWeight">Current Weight (lbs)</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    placeholder="Enter your current weight"
                    value={formData.currentWeight}
                    onChange={(e) => handleInputChange("currentWeight", e.target.value)}
                    data-testid="input-current-weight"
                  />
                </div>

                <div>
                  <Label htmlFor="targetWeight">Target Weight (lbs)</Label>
                  <Input
                    id="targetWeight"
                    type="number"
                    placeholder="Enter your target weight"
                    value={formData.targetWeight}
                    onChange={(e) => handleInputChange("targetWeight", e.target.value)}
                    data-testid="input-target-weight"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="Enter your height in centimeters"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    data-testid="input-height"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Personal Details</h3>
                <p className="text-muted-foreground">Complete your profile for better recommendations</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    data-testid="input-date-of-birth"
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="activityLevel">Activity Level</Label>
                  <Select value={formData.activityLevel} onValueChange={(value) => handleInputChange("activityLevel", value)}>
                    <SelectTrigger data-testid="select-activity-level">
                      <SelectValue placeholder="Select your activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                      <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                      <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                      <SelectItem value="extremely_active">Extremely Active (very hard exercise, physical job)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                data-testid="button-back"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || updateProfileMutation.isPending}
              className="ml-auto"
              data-testid="button-next"
            >
              {updateProfileMutation.isPending ? (
                "Setting up..."
              ) : step === 3 ? (
                "Complete Setup"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
