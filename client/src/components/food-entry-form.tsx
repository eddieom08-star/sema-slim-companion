import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Loader2, Search, X, ChefHat, Utensils } from "lucide-react";

export function FoodEntryForm() {
  const [activeTab, setActiveTab] = useState("search");
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeSearchResult, setBarcodeSearchResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
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
        consumedAt: new Date(),
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
      quantity: parseFloat(formData.quantity).toString(),
      calories: parseInt(formData.calories),
      protein: (parseFloat(formData.protein) || 0).toString(),
      carbs: (parseFloat(formData.carbs) || 0).toString(),
      fat: (parseFloat(formData.fat) || 0).toString(),
      fiber: (parseFloat(formData.fiber) || 0).toString(),
      sugar: (parseFloat(formData.sugar) || 0).toString(),
      sodium: (parseFloat(formData.sodium) || 0).toString(),
    });
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setIsSearchingBarcode(true);
    setBarcodeSearchResult(null);
    
    try {
      const response = await fetch(`/api/food-database/barcode/${barcode}`, {
        credentials: "include",
      });
      
      if (response.status === 401) {
        toast({
          title: "Authentication required",
          description: "Please log in to use barcode scanning.",
          variant: "destructive",
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error("Food not found");
      }
      
      const food = await response.json();
      setBarcodeSearchResult(food);
      
      // Auto-fill form with found food data
      setFormData({
        foodName: food.name,
        brand: food.brand || "",
        barcode: food.barcode,
        quantity: food.servingSize?.toString() || "100",
        unit: food.servingUnit || "grams",
        calories: food.calories.toString(),
        protein: food.protein?.toString() || "0",
        carbs: food.carbs?.toString() || "0",
        fat: food.fat?.toString() || "0",
        fiber: food.fiber?.toString() || "0",
        sugar: food.sugar?.toString() || "0",
        sodium: food.sodium?.toString() || "0",
        mealType: formData.mealType,
      });
      
      toast({
        title: "Food found!",
        description: `${food.name} has been loaded. Adjust quantity if needed and add to your log.`,
      });
      
      // Switch to manual tab so user can adjust and submit
      setActiveTab("manual");
    } catch (error) {
      toast({
        title: "Food not found",
        description: "This barcode is not in our database. Try manual entry or a different product.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  // Search functionality with debouncing
  useEffect(() => {
    const searchFoods = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/food-database/search?q=${encodeURIComponent(searchQuery)}&limit=15`, {
          credentials: "include",
        });
        
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchFoods, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectFood = (food: any) => {
    setSelectedFood(food);
    setPortionMultiplier(1);
    
    // Pre-fill form with selected food
    setFormData({
      foodName: food.name,
      brand: food.brand || "",
      barcode: food.barcode || "",
      quantity: food.servingSize?.toString() || "100",
      unit: food.servingUnit || "grams",
      calories: Math.round(food.calories * 1).toString(),
      protein: (food.protein * 1).toFixed(1),
      carbs: (food.carbs * 1).toFixed(1),
      fat: (food.fat * 1).toFixed(1),
      fiber: (food.fiber * 1).toFixed(1),
      sugar: (food.sugar * 1).toFixed(1),
      sodium: Math.round(food.sodium * 1).toString(),
      mealType: formData.mealType,
    });
  };

  const handlePortionAdjustment = (multiplier: number) => {
    if (!selectedFood) return;
    
    setPortionMultiplier(multiplier);
    setFormData(prev => ({
      ...prev,
      quantity: (selectedFood.servingSize * multiplier).toFixed(1),
      calories: Math.round(selectedFood.calories * multiplier).toString(),
      protein: (selectedFood.protein * multiplier).toFixed(1),
      carbs: (selectedFood.carbs * multiplier).toFixed(1),
      fat: (selectedFood.fat * multiplier).toFixed(1),
      fiber: (selectedFood.fiber * multiplier).toFixed(1),
      sugar: (selectedFood.sugar * multiplier).toFixed(1),
      sodium: Math.round(selectedFood.sodium * multiplier).toString(),
    }));
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="barcode">Barcode</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4 mt-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search foods (e.g., chicken breast, banana)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              data-testid="input-food-search"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Searching...</span>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No foods found</p>
              <p className="text-sm">Try a different search term or use manual entry</p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((food: any, index: number) => (
                <button
                  key={`${food.id}-${index}`}
                  onClick={() => handleSelectFood(food)}
                  className="w-full p-3 border border-border rounded-lg hover:bg-accent text-left transition-colors"
                  data-testid={`food-result-${index}`}
                >
                  <div className="flex items-start space-x-3">
                    {food.imageUrl ? (
                      <img 
                        src={food.imageUrl} 
                        alt={food.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <Utensils className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{food.name}</h4>
                      {food.brand && (
                        <p className="text-sm text-muted-foreground truncate">{food.brand}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {food.servingSize}{food.servingUnit}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searchQuery && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Start typing to search foods</p>
              <p className="text-sm">Search from thousands of products</p>
            </div>
          )}

          {selectedFood && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="bg-accent/20 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-4">
                  {selectedFood.imageUrl && (
                    <img 
                      src={selectedFood.imageUrl} 
                      alt={selectedFood.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{selectedFood.name}</h4>
                    {selectedFood.brand && (
                      <p className="text-sm text-muted-foreground">{selectedFood.brand}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFood(null);
                      setPortionMultiplier(1);
                    }}
                    data-testid="button-deselect-food"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Portion Size Adjustment */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Portion Size</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Slider
                        value={[portionMultiplier]}
                        onValueChange={(value) => handlePortionAdjustment(value[0])}
                        min={0.25}
                        max={4}
                        step={0.25}
                        className="w-full"
                        data-testid="slider-portion-size"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.25x</span>
                        <span>1x</span>
                        <span>2x</span>
                        <span>4x</span>
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className="text-2xl font-bold text-primary">{portionMultiplier}x</div>
                      <div className="text-xs text-muted-foreground">
                        {formData.quantity} {formData.unit}
                      </div>
                    </div>
                  </div>

                  {/* Portion Presets */}
                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1, 1.5, 2].map((preset) => (
                      <Button
                        key={preset}
                        variant={portionMultiplier === preset ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePortionAdjustment(preset)}
                        data-testid={`button-portion-${preset}`}
                      >
                        {preset}x
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Nutrition Preview */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{formData.calories}</div>
                    <div className="text-xs text-muted-foreground">cal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-secondary">{formData.protein}g</div>
                    <div className="text-xs text-muted-foreground">protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">{formData.carbs}g</div>
                    <div className="text-xs text-muted-foreground">carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-destructive">{formData.fat}g</div>
                    <div className="text-xs text-muted-foreground">fat</div>
                  </div>
                </div>
              </div>

              {/* Meal Type Selection */}
              <div>
                <Label htmlFor="mealType">Meal Type</Label>
                <Select value={formData.mealType} onValueChange={(value) => handleInputChange("mealType", value)}>
                  <SelectTrigger data-testid="select-meal-type-search">
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

              <Button 
                onClick={handleSubmit}
                className="w-full"
                disabled={createFoodEntry.isPending}
                data-testid="button-add-food-search"
              >
                {createFoodEntry.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Add to {formData.mealType}
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

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
          {isSearchingBarcode && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Searching food database...</span>
            </div>
          )}
          
          {!isSearchingBarcode && (
            <BarcodeScanner 
              onScanSuccess={handleBarcodeScanned}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
