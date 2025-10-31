import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import { FoodEntryForm } from "@/components/food-entry-form";
import { HungerChart } from "@/components/hunger-chart";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Brain, Zap, Pizza, IceCream, Cookie } from "lucide-react";

export default function FoodTracking() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hungerLevel, setHungerLevel] = useState(5);
  const [fullnessLevel, setFullnessLevel] = useState(0);
  const [cravingIntensity, setCravingIntensity] = useState(0);
  const [cravingType, setCravingType] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: foodEntries, isLoading } = useQuery({
    queryKey: ["/api/food-entries", dateStr],
    queryFn: async () => {
      const response = await fetch(`/api/food-entries?date=${dateStr}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch food entries");
      return response.json();
    },
  });

  const { data: hungerLogs } = useQuery({
    queryKey: ["/api/hunger-logs"],
    queryFn: async () => {
      const response = await fetch(`/api/hunger-logs?limit=10`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch hunger logs");
      return response.json();
    },
  });

  const deleteFoodEntry = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/food-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries"] });
      toast({
        title: "Food entry deleted",
        description: "The food entry has been removed from your log.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete food entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logHunger = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/hunger-logs", {
        hungerBefore: Math.max(hungerLevel, 1),
        hungerAfter: fullnessLevel > 0 ? Math.max(11 - fullnessLevel, 1) : null,
        cravingIntensity: cravingIntensity > 0 ? cravingIntensity : null,
        cravingType: cravingType || null,
        loggedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunger-logs"] });
      toast({
        title: "Hunger log recorded",
        description: "Your appetite data has been saved successfully.",
      });
      // Reset form
      setHungerLevel(5);
      setFullnessLevel(0);
      setCravingIntensity(0);
      setCravingType("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save hunger log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const todaysCalories = foodEntries?.reduce((sum: number, entry: any) => sum + entry.calories, 0) || 0;
  const todaysProtein = foodEntries?.reduce((sum: number, entry: any) => sum + Number(entry.protein), 0) || 0;
  const todaysCarbs = foodEntries?.reduce((sum: number, entry: any) => sum + Number(entry.carbs), 0) || 0;
  const todaysFat = foodEntries?.reduce((sum: number, entry: any) => sum + Number(entry.fat), 0) || 0;

  const calorieTarget = 1400; // This could be dynamic based on user profile
  const proteinTarget = 120;
  const carbsTarget = 120;
  const fatTarget = 50;

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  const getFoodEntriesByMeal = (mealType: string) => {
    return foodEntries?.filter((entry: any) => entry.mealType === mealType) || [];
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 overflow-x-hidden">
      <Navigation />

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Food Tracking</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track your meals and monitor your nutrition for optimal GLP-1 results
          </p>
        </div>

        {/* Nutrition Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card data-testid="card-calories-summary">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-foreground mb-2">
                {todaysCalories}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Calories</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${Math.min((todaysCalories / calorieTarget) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {calorieTarget - todaysCalories} remaining
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-protein-summary">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-foreground mb-2">
                {todaysProtein.toFixed(1)}g
              </div>
              <div className="text-sm text-muted-foreground mb-2">Protein</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-secondary h-2 rounded-full"
                  style={{ width: `${Math.min((todaysProtein / proteinTarget) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.max(proteinTarget - todaysProtein, 0).toFixed(1)}g to go
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-carbs-summary">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-foreground mb-2">
                {todaysCarbs.toFixed(1)}g
              </div>
              <div className="text-sm text-muted-foreground mb-2">Carbs</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full"
                  style={{ width: `${Math.min((todaysCarbs / carbsTarget) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.max(carbsTarget - todaysCarbs, 0).toFixed(1)}g to go
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-fat-summary">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-2xl font-bold text-foreground mb-2">
                {todaysFat.toFixed(1)}g
              </div>
              <div className="text-sm text-muted-foreground mb-2">Fat</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-destructive h-2 rounded-full"
                  style={{ width: `${Math.min((todaysFat / fatTarget) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.max(fatTarget - todaysFat, 0).toFixed(1)}g to go
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Food Form - Moved to second section */}
        <div className="mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-plus text-secondary"></i>
                <span>Add Food</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FoodEntryForm />
            </CardContent>
          </Card>
        </div>

        {/* Food Log */}
        <div className="mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-calendar text-primary"></i>
                  <span>Food Log</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="breakfast" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  {mealTypes.map(meal => (
                    <TabsTrigger key={meal} value={meal} className="capitalize">
                      {meal}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {mealTypes.map(meal => (
                  <TabsContent key={meal} value={meal} className="mt-6">
                    <div className="space-y-4" data-testid={`meal-entries-${meal}`}>
                      {getFoodEntriesByMeal(meal).map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{entry.foodName}</h4>
                            {entry.brand && (
                              <p className="text-sm text-muted-foreground">{entry.brand}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {entry.quantity} {entry.unit} • {entry.calories} cal
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right text-sm">
                              <p className="font-medium">{entry.calories} cal</p>
                              <p className="text-muted-foreground">
                                P: {Number(entry.protein).toFixed(1)}g •
                                C: {Number(entry.carbs).toFixed(1)}g •
                                F: {Number(entry.fat).toFixed(1)}g
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFoodEntry.mutate(entry.id)}
                              disabled={deleteFoodEntry.isPending}
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <i className="fas fa-trash text-destructive"></i>
                            </Button>
                          </div>
                        </div>
                      ))}

                      {getFoodEntriesByMeal(meal).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <i className="fas fa-utensils text-2xl mb-2"></i>
                          <p>No {meal} entries yet</p>
                          <p className="text-sm">Add your first {meal} item!</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Hunger & Appetite Tracking - Moved lower down */}
        <div className="mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-primary" />
                <span>Appetite & Satiety Intelligence</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Track your hunger and fullness levels to optimize your GLP-1 medication response
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hunger Level */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Hunger Level</label>
                    <span className="text-2xl font-bold text-primary">{hungerLevel}/10</span>
                  </div>
                  <Slider
                    value={[hungerLevel]}
                    onValueChange={(value) => setHungerLevel(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                    data-testid="slider-hunger-level"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Not Hungry</span>
                    <span>Starving</span>
                  </div>
                </div>

                {/* Fullness Level */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Fullness Level</label>
                    <span className="text-2xl font-bold text-secondary">{fullnessLevel}/10</span>
                  </div>
                  <Slider
                    value={[fullnessLevel]}
                    onValueChange={(value) => setFullnessLevel(value[0])}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                    data-testid="slider-fullness-level"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Empty</span>
                    <span>Very Full</span>
                  </div>
                </div>

                {/* Craving Tracking */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Craving Intensity</label>
                    <span className="text-2xl font-bold text-accent">{cravingIntensity}/10</span>
                  </div>
                  <Slider
                    value={[cravingIntensity]}
                    onValueChange={(value) => setCravingIntensity(value[0])}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                    data-testid="slider-craving-intensity"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>None</span>
                    <span>Strong</span>
                  </div>
                </div>

                {/* Craving Type */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Craving Type (Optional)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "sweet", icon: IceCream, label: "Sweet" },
                      { type: "salty", icon: Pizza, label: "Salty" },
                      { type: "carbs", icon: Cookie, label: "Carbs" },
                    ].map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        variant={cravingType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCravingType(cravingType === type ? "" : type)}
                        className="flex flex-col items-center py-4 h-auto"
                        data-testid={`button-craving-${type}`}
                      >
                        <Icon className="w-5 h-5 mb-1" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground" data-testid="text-last-logged">
                  <Zap className="w-4 h-4 inline mr-1" />
                  Last logged: {hungerLogs?.[0] ? format(new Date(hungerLogs[0].loggedAt), 'h:mm a') : 'Never'}
                </div>
                <Button
                  onClick={() => logHunger.mutate()}
                  disabled={logHunger.isPending}
                  data-testid="button-log-hunger"
                >
                  {logHunger.isPending ? "Saving..." : "Log Appetite"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appetite Trends Chart */}
        <div className="mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-chart-line text-primary"></i>
                <span>Appetite History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HungerChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
