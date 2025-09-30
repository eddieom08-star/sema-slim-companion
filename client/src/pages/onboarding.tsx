import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

const MEDICATION_DOSES = {
  ozempic: ["0.25mg", "0.5mg", "1mg", "2mg"],
  mounjaro: ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"],
  wegovy: ["0.25mg", "0.5mg", "1mg", "1.7mg", "2.4mg"],
  rybelsus: ["3mg", "7mg", "14mg"]
};

const MEDICATION_FREQUENCIES = {
  ozempic: "weekly",
  mounjaro: "weekly",
  wegovy: "weekly",
  rybelsus: "daily"
};

interface FormData {
  medicationType: string;
  currentDose: string;
  startDate: string;
  currentWeight: string;
  targetWeight: string;
  height: string;
  dateOfBirth: string;
  gender: string;
  activityLevel: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    medicationType: "",
    currentDose: "",
    startDate: "",
    currentWeight: "",
    targetWeight: "",
    height: "",
    dateOfBirth: "",
    gender: "",
    activityLevel: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get authenticated user data
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('semaslim_onboarding_progress');
    if (saved) {
      try {
        const { step: savedStep, data } = JSON.parse(saved);
        setStep(savedStep);
        setFormData(data);
      } catch (e) {
        console.error('Failed to load saved progress');
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('semaslim_onboarding_progress', JSON.stringify({
      step,
      data: formData
    }));
  }, [step, formData]);

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
      // Clear saved progress after successful completion
      localStorage.removeItem('semaslim_onboarding_progress');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createMedicationMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/medications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medications"] });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
      if (!formData.medicationType) {
        newErrors.medicationType = "Please select your medication";
      }
      if (!formData.currentDose) {
        newErrors.currentDose = "Please select your current dose";
      }
      if (!formData.startDate) {
        newErrors.startDate = "Please enter when you started the medication";
      } else {
        const startDate = new Date(formData.startDate);
        if (startDate > new Date()) {
          newErrors.startDate = "Start date cannot be in the future";
        }
      }
    }

    if (step === 2) {
      const currentWeight = parseFloat(formData.currentWeight);
      const targetWeight = parseFloat(formData.targetWeight);
      const height = parseFloat(formData.height);

      if (!formData.currentWeight) {
        newErrors.currentWeight = "Please enter your current weight";
      } else if (currentWeight <= 0 || currentWeight > 1000) {
        newErrors.currentWeight = "Please enter a valid weight (1-1000 lbs)";
      }

      if (!formData.targetWeight) {
        newErrors.targetWeight = "Please enter your target weight";
      } else if (targetWeight <= 0 || targetWeight > 1000) {
        newErrors.targetWeight = "Please enter a valid target weight (1-1000 lbs)";
      } else if (targetWeight >= currentWeight) {
        newErrors.targetWeight = "Target weight should be less than current weight";
      }

      if (!formData.height) {
        newErrors.height = "Please enter your height";
      } else if (height <= 0 || height > 300) {
        newErrors.height = "Please enter a valid height (1-300 cm)";
      }
    }

    if (step === 3) {
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Please enter your date of birth";
      } else {
        const birthDate = new Date(formData.dateOfBirth);
        const age = (new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 18) {
          newErrors.dateOfBirth = "You must be at least 18 years old";
        } else if (age > 120) {
          newErrors.dateOfBirth = "Please enter a valid date of birth";
        }
      }

      if (!formData.gender) {
        newErrors.gender = "Please select your gender";
      }

      if (!formData.activityLevel) {
        newErrors.activityLevel = "Please select your activity level";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast({
        title: "Please fix the errors",
        description: "Some fields need your attention.",
        variant: "destructive",
      });
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    const profileData = {
      medicationType: formData.medicationType,
      currentWeight: formData.currentWeight,
      targetWeight: formData.targetWeight,
      height: formData.height,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      activityLevel: formData.activityLevel,
      startDate: formData.startDate,
      onboardingCompleted: true,
    };

    try {
      await updateProfileMutation.mutateAsync(profileData);

      // Create initial medication record
      if (user?.id) {
        const medicationData = {
          userId: user.id,
          medicationType: formData.medicationType,
          dosage: formData.currentDose,
          frequency: MEDICATION_FREQUENCIES[formData.medicationType as keyof typeof MEDICATION_FREQUENCIES],
          startDate: formData.startDate,
          nextDueDate: calculateNextDueDate(formData.startDate, formData.medicationType),
          reminderEnabled: true,
        };

        await createMedicationMutation.mutateAsync(medicationData);
      }
    } catch (error) {
      console.error("Onboarding error:", error);
    }
  };

  const calculateNextDueDate = (startDate: string, medicationType: string): string => {
    const start = new Date(startDate);
    const frequency = MEDICATION_FREQUENCIES[medicationType as keyof typeof MEDICATION_FREQUENCIES];
    
    if (frequency === "weekly") {
      start.setDate(start.getDate() + 7);
    } else {
      start.setDate(start.getDate() + 1);
    }
    
    return start.toISOString();
  };

  const availableDoses = formData.medicationType 
    ? MEDICATION_DOSES[formData.medicationType as keyof typeof MEDICATION_DOSES] || []
    : [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-heartbeat text-primary-foreground text-xl"></i>
          </div>
          <CardTitle className="text-2xl">Welcome to SemaSlim</CardTitle>
          <CardDescription>
            Let's personalize your GLP-1 weight management journey
          </CardDescription>
          
          {/* Progress indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    step > stepNumber 
                      ? "bg-primary text-primary-foreground" 
                      : step === stepNumber
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`progress-step-${stepNumber}`}
                >
                  {step > stepNumber ? <CheckCircle2 className="w-5 h-5" /> : stepNumber}
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  {stepNumber === 1 ? "Medication" : stepNumber === 2 ? "Health" : "Details"}
                </p>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Medication Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Medication Information</h3>
                <p className="text-muted-foreground">Tell us about your GLP-1 medication</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="medicationType">Which medication are you taking? *</Label>
                  <Select 
                    value={formData.medicationType} 
                    onValueChange={(value) => {
                      handleInputChange("medicationType", value);
                      handleInputChange("currentDose", ""); // Reset dose when medication changes
                    }}
                  >
                    <SelectTrigger 
                      data-testid="select-medication-type"
                      className={errors.medicationType ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select your medication" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ozempic">Ozempic (Semaglutide)</SelectItem>
                      <SelectItem value="mounjaro">Mounjaro (Tirzepatide)</SelectItem>
                      <SelectItem value="wegovy">Wegovy (Semaglutide)</SelectItem>
                      <SelectItem value="rybelsus">Rybelsus (Oral Semaglutide)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.medicationType && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.medicationType}
                    </p>
                  )}
                </div>

                {formData.medicationType && (
                  <div>
                    <Label htmlFor="currentDose">Current Dose *</Label>
                    <Select 
                      value={formData.currentDose} 
                      onValueChange={(value) => handleInputChange("currentDose", value)}
                    >
                      <SelectTrigger 
                        data-testid="select-current-dose"
                        className={errors.currentDose ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Select your current dose" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDoses.map((dose) => (
                          <SelectItem key={dose} value={dose}>
                            {dose}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.currentDose && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.currentDose}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="startDate">When did you start taking this medication? *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    data-testid="input-start-date"
                    className={errors.startDate ? "border-destructive" : ""}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                {formData.medicationType && (
                  <Alert>
                    <AlertDescription>
                      <strong>{formData.medicationType === "rybelsus" ? "Daily" : "Weekly"} Medication:</strong> 
                      {" "}{formData.medicationType === "rybelsus" 
                        ? "Take once daily, at least 30 minutes before food or drink." 
                        : "Inject once weekly on the same day each week."}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Physical Information */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Physical Information</h3>
                <p className="text-muted-foreground">Help us set your personalized targets</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentWeight">Current Weight (lbs) *</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    step="0.1"
                    placeholder="Enter your current weight"
                    value={formData.currentWeight}
                    onChange={(e) => handleInputChange("currentWeight", e.target.value)}
                    data-testid="input-current-weight"
                    className={errors.currentWeight ? "border-destructive" : ""}
                  />
                  {errors.currentWeight && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.currentWeight}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="targetWeight">Target Weight (lbs) *</Label>
                  <Input
                    id="targetWeight"
                    type="number"
                    step="0.1"
                    placeholder="Enter your target weight"
                    value={formData.targetWeight}
                    onChange={(e) => handleInputChange("targetWeight", e.target.value)}
                    data-testid="input-target-weight"
                    className={errors.targetWeight ? "border-destructive" : ""}
                  />
                  {errors.targetWeight && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.targetWeight}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="height">Height (cm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="Enter your height in centimeters (e.g., 170)"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    data-testid="input-height"
                    className={errors.height ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: 5'6" = 168 cm, 5'9" = 175 cm, 6'0" = 183 cm
                  </p>
                  {errors.height && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.height}
                    </p>
                  )}
                </div>
              </div>

              {formData.currentWeight && formData.targetWeight && (
                <Alert>
                  <AlertDescription>
                    <strong>Goal:</strong> Lose {(parseFloat(formData.currentWeight) - parseFloat(formData.targetWeight)).toFixed(1)} lbs
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Personal Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Personal Details</h3>
                <p className="text-muted-foreground">Complete your profile for better recommendations</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    data-testid="input-date-of-birth"
                    className={errors.dateOfBirth ? "border-destructive" : ""}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => handleInputChange("gender", value)}
                  >
                    <SelectTrigger 
                      data-testid="select-gender"
                      className={errors.gender ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.gender}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="activityLevel">Activity Level *</Label>
                  <Select 
                    value={formData.activityLevel} 
                    onValueChange={(value) => handleInputChange("activityLevel", value)}
                  >
                    <SelectTrigger 
                      data-testid="select-activity-level"
                      className={errors.activityLevel ? "border-destructive" : ""}
                    >
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
                  {errors.activityLevel && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.activityLevel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6 border-t">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                data-testid="button-back"
                disabled={updateProfileMutation.isPending}
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={updateProfileMutation.isPending}
              className={step === 1 ? "ml-auto" : ""}
              data-testid="button-next"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Setting up...
                </>
              ) : step === 3 ? (
                <>
                  Complete Setup
                  <i className="fas fa-check ml-2"></i>
                </>
              ) : (
                <>
                  Next
                  <i className="fas fa-arrow-right ml-2"></i>
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your progress is automatically saved
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
