import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function FoodEntryForm() {
  const [activeTab, setActiveTab] = useState("manual");
  const [formData, setFormData] = useState({
    foodName: "",
    brand: "",
    barcode: "",
    quantity: "",
    unit: "grams",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
    mealType: "breakfast",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFoodEntry = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/food-entries", {
        ...data,
        consumedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setFormData({
        foodName: "",
        brand: "",
        barcode: "",
        quantity: "",
        unit: "grams",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
        sugar: "",
        sodium: "",
        mealType: "breakfast",
      });
      toast({
        title: "Food entry added",
        description: "Your food has been logged successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add food entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.foodName || !formData.quantity || !formData.calories) {
      toast({
        title: "Missing information",
        description: "Please fill in the food name, quantity, and calories.",
        variant: "destructive",
      });
      return;
    }

    createFoodEntry.mutate({
      ...formData,
      quantity: parseFloat(formData.quantity),
      calories: parseInt(formData.calories),
      protein: parseFloat(formData.protein) || 0,
      carbs: parseFloat(formData.carbs) || 0,
      fat: parseFloat(formData.fat) || 0,
      fiber: parseFloat(formData.fiber) || 0,
      sugar: parseFloat(formData.sugar) || 0,
      sodium: parseFloat(formData.sodium) || 0,
    });
  };

  const handleBarcodeSearch = () => {
    // Placeholder for barcode scanning functionality
    toast({
      title: "Feature coming soon",
      description: "Barcode scanning will be available in a future update.",
    });
  };

  const calculateMacroPercentages = () => {
    const calories = parseInt(formData.calories) || 0;
    const protein = parseFloat(formData.protein) || 0;
    const carbs = parseFloat(formData.carbs) || 0;
    const fat = parseFloat(formData.fat) || 0;

    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;
    const totalMacroCals = proteinCals + carbsCals + fatCals;

    if (totalMacroCals === 0) return { protein: 0, carbs: 0, fat: 0 };

    return {
      protein: Math.round((proteinCals / totalMacroCals) * 100),
      carbs: Math.round((carbsCals / totalMacroCals) * 100),
      fat: Math.round((fatCals / totalMacroCals) * 100),
    };
  };

  const macroPercentages = calculateMacroPercentages();

  return (
    <div className="space-y-6" data-testid="food-entry-form">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="barcode">Barcode Scan</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="foodName">Food Name *</Label>
                <Input
                  id="foodName"
                  placeholder="e.g., Grilled chicken breast"
                  value={formData.foodName}
                  onChange={(e) => handleInputChange("foodName", e.target.value)}
                  required
                  data-testid="input-food-name"
                />
              </div>

              <div>
                <Label htmlFor="brand">Brand (optional)</Label>
                <Input
                  id="brand"
                  placeholder="e.g., Tyson"
                  value={formData.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  data-testid="input-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    placeholder="100"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", e.target.value)}
                    required
                    data-testid="input-quantity"
                  />
                </div>

                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                    <SelectTrigger data-testid="select-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grams">grams</SelectItem>
                      <SelectItem value="ounces">ounces</SelectItem>
                      <SelectItem value="cups">cups</SelectItem>
                      <SelectItem value="pieces">pieces</SelectItem>
                      <SelectItem value="slices">slices</SelectItem>
                      <SelectItem value="tablespoons">tablespoons</SelectItem>
                      <SelectItem value="teaspoons">teaspoons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="mealType">Meal Type</Label>
                <Select value={formData.mealType} onValueChange={(value) => handleInputChange("mealType", value)}>
                  <SelectTrigger data-testid="select-meal-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nutrition Information */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="font-medium text-foreground">Nutrition Information</h4>
              
              <div>
                <Label htmlFor="calories">Calories *</Label>
                <Input
                  id="calories"
                  type="number"
                  placeholder="250"
                  value={formData.calories}
                  onChange={(e) => handleInputChange("calories", e.target.value)}
                  required
                  data-testid="input-calories"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    step="0.1"
                    placeholder="25"
                    value={formData.protein}
                    onChange={(e) => handleInputChange("protein", e.target.value)}
                    data-testid="input-protein"
                  />
                </div>

                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.carbs}
                    onChange={(e) => handleInputChange("carbs", e.target.value)}
                    data-testid="input-carbs"
                  />
                </div>

                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    step="0.1"
                    placeholder="5"
                    value={formData.fat}
                    onChange={(e) => handleInputChange("fat", e.target.value)}
                    data-testid="input-fat"
                  />
                </div>
              </div>

              {/* Macro breakdown visualization */}
              {(formData.protein || formData.carbs || formData.fat) && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-2">Macro Breakdown</div>
                  <div className="flex space-x-1 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-secondary" 
                      style={{ width: `${macroPercentages.protein}%` }}
                    ></div>
                    <div 
                      className="bg-accent" 
                      style={{ width: `${macroPercentages.carbs}%` }}
                    ></div>
                    <div 
                      className="bg-destructive" 
                      style={{ width: `${macroPercentages.fat}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>P: {macroPercentages.protein}%</span>
                    <span>C: {macroPercentages.carbs}%</span>
                    <span>F: {macroPercentages.fat}%</span>
                  </div>
                </div>
              )}

              {/* Optional nutrients */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="fiber">Fiber (g)</Label>
                  <Input
                    id="fiber"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.fiber}
                    onChange={(e) => handleInputChange("fiber", e.target.value)}
                    data-testid="input-fiber"
                  />
                </div>

                <div>
                  <Label htmlFor="sugar">Sugar (g)</Label>
                  <Input
                    id="sugar"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.sugar}
                    onChange={(e) => handleInputChange("sugar", e.target.value)}
                    data-testid="input-sugar"
                  />
                </div>

                <div>
                  <Label htmlFor="sodium">Sodium (mg)</Label>
                  <Input
                    id="sodium"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={formData.sodium}
                    onChange={(e) => handleInputChange("sodium", e.target.value)}
                    data-testid="input-sodium"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createFoodEntry.isPending}
              data-testid="button-add-food"
            >
              {createFoodEntry.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Add Food Entry
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-4 mt-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-barcode text-2xl text-muted-foreground"></i>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Barcode Scanner</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Scan product barcodes to quickly add foods with nutritional information
            </p>
            
            <Button onClick={handleBarcodeSearch} data-testid="button-scan-barcode">
              <i className="fas fa-camera mr-2"></i>
              Scan Barcode
            </Button>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Feature coming soon! For now, please use manual entry to add your foods.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
