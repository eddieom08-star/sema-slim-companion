import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, User, Activity, Pill, Info } from "lucide-react";

const MEDICATION_DOSES = {
  ozempic: ["0.25mg", "0.5mg", "1mg", "2mg"],
  mounjaro: ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"],
  wegovy: ["0.25mg", "0.5mg", "1mg", "1.7mg", "2.4mg"],
  rybelsus: ["3mg", "7mg", "14mg"]
};

interface FormErrors {
  [key: string]: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const [profileData, setProfileData] = useState({
    currentWeight: "",
    targetWeight: "",
    height: "",
    dateOfBirth: "",
    gender: "",
    activityLevel: "",
  });

  const [medicationData, setMedicationData] = useState({
    medicationType: "",
    startDate: "",
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setProfileData({
        currentWeight: user.currentWeight || "",
        targetWeight: user.targetWeight || "",
        height: user.height || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender || "",
        activityLevel: user.activityLevel || "",
      });
      setMedicationData({
        medicationType: user.medicationType || "",
        startDate: user.startDate || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/user/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleMedicationChange = (field: string, value: string) => {
    setMedicationData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateProfileData = (): boolean => {
    const newErrors: FormErrors = {};

    if (profileData.currentWeight) {
      const currentWeight = parseFloat(profileData.currentWeight);
      if (currentWeight <= 0 || currentWeight > 1000) {
        newErrors.currentWeight = "Please enter a valid weight (1-1000 lbs)";
      }
    }

    if (profileData.targetWeight) {
      const targetWeight = parseFloat(profileData.targetWeight);
      const currentWeight = parseFloat(profileData.currentWeight);
      if (targetWeight <= 0 || targetWeight > 1000) {
        newErrors.targetWeight = "Please enter a valid target weight (1-1000 lbs)";
      } else if (profileData.currentWeight && targetWeight >= currentWeight) {
        newErrors.targetWeight = "Target weight should be less than current weight";
      }
    }

    if (profileData.height) {
      const height = parseFloat(profileData.height);
      if (height <= 0 || height > 300) {
        newErrors.height = "Please enter a valid height (1-300 cm)";
      }
    }

    if (profileData.dateOfBirth) {
      const birthDate = new Date(profileData.dateOfBirth);
      const age = (new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      } else if (age > 120) {
        newErrors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileData()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving.",
        variant: "destructive",
      });
      return;
    }

    await updateProfileMutation.mutateAsync({
      ...profileData,
      ...medicationData,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="health" data-testid="tab-health">
              <Activity className="w-4 h-4 mr-2" />
              Health
            </TabsTrigger>
            <TabsTrigger value="medication" data-testid="tab-medication">
              <Pill className="w-4 h-4 mr-2" />
              Medication
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      data-testid="input-email"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your email is managed through Auth0 and cannot be changed here.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={user?.firstName || ""}
                        disabled
                        data-testid="input-first-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={user?.lastName || ""}
                        disabled
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => handleProfileChange("dateOfBirth", e.target.value)}
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
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={profileData.gender}
                      onValueChange={(value) => handleProfileChange("gender", value)}
                    >
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>Health Profile</CardTitle>
                <CardDescription>
                  Update your physical information and activity level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentWeight">Current Weight (lbs)</Label>
                    <Input
                      id="currentWeight"
                      type="number"
                      step="0.1"
                      placeholder="Enter your current weight"
                      value={profileData.currentWeight}
                      onChange={(e) => handleProfileChange("currentWeight", e.target.value)}
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
                    <Label htmlFor="targetWeight">Target Weight (lbs)</Label>
                    <Input
                      id="targetWeight"
                      type="number"
                      step="0.1"
                      placeholder="Enter your target weight"
                      value={profileData.targetWeight}
                      onChange={(e) => handleProfileChange("targetWeight", e.target.value)}
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
                </div>

                {profileData.currentWeight && profileData.targetWeight && (
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Weight Loss Goal:</strong>{" "}
                      {(parseFloat(profileData.currentWeight) - parseFloat(profileData.targetWeight)).toFixed(1)} lbs
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="Enter your height in centimeters"
                    value={profileData.height}
                    onChange={(e) => handleProfileChange("height", e.target.value)}
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

                <Separator />

                <div>
                  <Label htmlFor="activityLevel">Activity Level</Label>
                  <Select
                    value={profileData.activityLevel}
                    onValueChange={(value) => handleProfileChange("activityLevel", value)}
                  >
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medication Tab */}
          <TabsContent value="medication">
            <Card>
              <CardHeader>
                <CardTitle>Medication Information</CardTitle>
                <CardDescription>
                  View and update your GLP-1 medication details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="medicationType">Medication Type</Label>
                    <Select
                      value={medicationData.medicationType}
                      onValueChange={(value) => handleMedicationChange("medicationType", value)}
                    >
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
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={medicationData.startDate}
                      onChange={(e) => handleMedicationChange("startDate", e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      data-testid="input-start-date"
                    />
                  </div>

                  {medicationData.medicationType && (
                    <Alert>
                      <Info className="w-4 h-4" />
                      <AlertDescription>
                        <strong>Dosing Schedule:</strong>{" "}
                        {medicationData.medicationType === "rybelsus"
                          ? "Take once daily, at least 30 minutes before food or drink."
                          : "Inject once weekly on the same day each week."}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            size="lg"
            data-testid="button-save-settings"
          >
            {updateProfileMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
