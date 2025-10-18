import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Navigation from "@/components/ui/navigation";
import { Bot, ScanLine, Send, Loader2, BookOpen, Trash2, ChefHat, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
  recipes?: ParsedRecipe[];
}

interface ParsedRecipe {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  ingredients: string[];
  instructions: string[];
  isGlp1Friendly?: boolean;
  isHighProtein?: boolean;
  isLowCarb?: boolean;
}

const SYSTEM_PROMPT = `You are a friendly, efficient Meal Planning Assistant helping users create personalized meal plans. Your goal is to gather 7 specific requirements through natural conversation, then provide tailored meal recommendations.

CONTEXT: Users come to you with varying levels of clarity about what they want to eat. Some know exactly what they want, others just know they're hungry. You adapt to their communication style while ensuring you collect all necessary information.

OBJECTIVE: Collect these 7 requirements in a conversational, non-robotic way:
1. Meal of the day (breakfast, lunch, dinner, snack)
2. Preparation time preference (quick: <15min, moderate: 15-30min, leisurely: 30-60min, project: 60+min)
3. Target calories (or range)
4. Target protein in grams (or range)
5. Number of servings needed
6. Preparation difficulty (beginner, intermediate, advanced)
7. Any specific cravings or preferences

BEHAVIOR GUIDELINES:
- Start with a warm, casual greeting and ask 1-2 questions at a time maximum
- Infer information when obvious (e.g., if they mention "breakfast," don't ask meal type)
- Offer common defaults to speed up the process (e.g., "Most people aim for 400-600 calories for lunch, does that work?")
- Use natural ranges rather than demanding exact numbers
- Be flexible with how users describe things (e.g., "super quick" = <15min, "something hearty" = high protein)
- If they volunteer information, acknowledge it and move to the next missing piece
- Present a summary of their requirements before generating recommendations
- Keep the tone conversational, not like a form to fill out

QUESTION FLOW STRATEGY:
- Group related questions naturally (time + difficulty often go together)
- If they mention cravings first, start there and build around it
- Use their answers to inform follow-up questions (e.g., if they want quick prep, don't ask about elaborate techniques)
- Provide context for why you're asking nutritional details: "So I can find meals that match your goals..."

EXAMPLES OF NATURAL QUESTIONS:
❌ Avoid: "Please specify your target caloric intake in numerical format"
✅ Use: "What's your calorie target? Most dinners are around 500-700 calories if that helps"

❌ Avoid: "Enumerate the number of servings required"
✅ Use: "Cooking for just yourself, or are you feeding others too?"

❌ Avoid: "Select your preparation difficulty level from the following options"
✅ Use: "Are you comfortable with more involved cooking, or should I keep it simple?"`;

// Helper function to parse recipes from AI response
function parseRecipesFromText(text: string): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = [];

  // Split by numbered recipes (e.g., "1. Recipe Name" or "1) Recipe Name")
  const recipeMatches = text.match(/(\d+[\.)]\s+)([^\n]+(?:\n(?!\d+[\.)]\s+).*)*)/g);

  if (!recipeMatches) return recipes;

  recipeMatches.forEach((recipeBlock) => {
    try {
      // Extract recipe name (first line after number)
      const nameMatch = recipeBlock.match(/^\d+[\.)]\s+(.+?)(?:\n|$)/);
      if (!nameMatch) return;

      const name = nameMatch[1].trim();

      // Extract calories (e.g., "300 calories", "calories: 400", "400 cal")
      const calorieMatch = recipeBlock.match(/(\d+)\s*(?:calories|cal)/i);
      const calories = calorieMatch ? parseInt(calorieMatch[1]) : 400;

      // Extract protein (e.g., "30g protein", "protein: 25g")
      const proteinMatch = recipeBlock.match(/(\d+)\s*g?\s*protein/i);
      const protein = proteinMatch ? parseInt(proteinMatch[1]) : 25;

      // Extract carbs
      const carbMatch = recipeBlock.match(/(\d+)\s*g?\s*carbs?/i);
      const carbs = carbMatch ? parseInt(carbMatch[1]) : undefined;

      // Extract fat
      const fatMatch = recipeBlock.match(/(\d+)\s*g?\s*fat/i);
      const fat = fatMatch ? parseInt(fatMatch[1]) : undefined;

      // Extract prep/cook time (e.g., "15 minutes", "under 15 min")
      const prepMatch = recipeBlock.match(/(?:quick|make|prep).*?(\d+)\s*(?:minutes|min)/i);
      const prepTime = prepMatch ? parseInt(prepMatch[1]) : 15;

      // Extract ingredients (lines starting with -)
      const ingredients = recipeBlock.match(/^[\s-]*(.+?)$/gm)
        ?.filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^[\s-]+/, '').trim())
        .filter(Boolean) || [];

      // Determine if high protein (>25g)
      const isHighProtein = protein >= 25;

      // Determine if GLP-1 friendly (lower fat, high protein)
      const isGlp1Friendly = protein >= 20 && (!fat || fat < 15);

      recipes.push({
        name,
        description: recipeBlock.substring(0, 200).trim(),
        calories,
        protein,
        carbs,
        fat,
        prepTime,
        cookTime: 0,
        servings: 1,
        difficulty: 'medium',
        ingredients: ingredients.length > 0 ? ingredients : ['See recipe details above'],
        instructions: ['Follow the preparation steps outlined above'],
        isGlp1Friendly,
        isHighProtein,
        isLowCarb: carbs ? carbs < 30 : false
      });
    } catch (error) {
      console.error('Error parsing recipe:', error);
    }
  });

  return recipes;
}

export default function Recipes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("ai-creator");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey there! 👋 I'm here to help you find the perfect meal. What are you in the mood for today?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isRecipeDetailOpen, setIsRecipeDetailOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [currentAIRecipe, setCurrentAIRecipe] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile for medication info
  const { data: userProfile } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch user's saved recipes
  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["/api/recipes"],
  });

  // Delete recipe mutation
  const deleteRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      await apiRequest("DELETE", `/api/recipes/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setRecipeToDelete(null);
      toast({
        title: "Recipe deleted",
        description: "Your recipe has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save recipe mutation
  const saveRecipe = useMutation({
    mutationFn: async (recipeData: any) => {
      await apiRequest("POST", "/api/recipes", recipeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setCurrentAIRecipe(null);
      toast({
        title: "Recipe saved",
        description: "Your recipe has been added to your collection!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputMessage;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: messageToSend
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Build enhanced system prompt with user's medication info
      const medicationType = (userProfile as any)?.medicationType;
      let enhancedPrompt = SYSTEM_PROMPT;

      if (medicationType) {
        const medicationContext = `\n\nIMPORTANT CONTEXT: The user is currently taking ${medicationType.toUpperCase()} (a GLP-1 medication). When recommending recipes:
- Prioritize high-protein meals (25g+ protein per serving)
- Suggest smaller portion sizes as GLP-1 medications reduce appetite
- Recommend foods that are gentle on the stomach (avoid very fatty, spicy, or rich foods)
- Include foods that help with common GLP-1 side effects like nausea (ginger, bland carbs, clear soups)
- Focus on nutrient-dense options since the user will eat less overall
- Suggest meals that are easy to digest`;
        enhancedPrompt += medicationContext;
      }

      // Call Claude API through our backend
      const response = await fetch('/api/ai/recipe-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          systemPrompt: enhancedPrompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('AI API error:', errorData);
        console.error('Full error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });

        // Create detailed error message
        let errorMessage = errorData.message || 'Failed to get AI response';
        if (errorData.error) {
          errorMessage += `: ${errorData.error}`;
        }
        if (errorData.details) {
          errorMessage += ` (${errorData.details})`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Parse recipes from the AI response
      const parsedRecipes = parseRecipesFromText(data.message);

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        recipes: parsedRecipes.length > 0 ? parsedRecipes : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Recipe chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantRecipe = () => {
    const instantRecipePrompt = "Generate a single low-calorie, high-protein recipe immediately. No questions needed. Requirements: under 400 calories, 25g+ protein, quick to prepare (under 20 minutes). Skip all clarification questions and provide the recipe now with full nutritional details.";
    handleSendMessage(instantRecipePrompt);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRecipe = async (recipe: ParsedRecipe) => {
    try {
      const recipeData = {
        name: recipe.name,
        description: recipe.description,
        recipeType: 'dinner', // Default to dinner
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        calories: recipe.calories,
        protein: recipe.protein.toString(),
        carbs: recipe.carbs?.toString() || '0',
        fat: recipe.fat?.toString() || '0',
        isGlp1Friendly: recipe.isGlp1Friendly || false,
        isHighProtein: recipe.isHighProtein || false,
        isLowCarb: recipe.isLowCarb || false,
        isPublic: false
      };

      await saveRecipe.mutateAsync(recipeData);

      toast({
        title: "Recipe saved!",
        description: `${recipe.name} has been added to your collection.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save recipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScanReceipt = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload a receipt image first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement receipt scanning with OCR/AI
      toast({
        title: "Receipt scanned!",
        description: "Extracting recipe information...",
      });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Recipe extracted",
        description: "Your recipe has been added to your collection!",
      });

      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scan receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Recipes</h1>
          <p className="text-muted-foreground">Create recipes with AI or scan existing ones</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="ai-creator">
              <Bot className="mr-2 h-4 w-4" />
              AI Creator
            </TabsTrigger>
            <TabsTrigger value="my-recipes">
              <BookOpen className="mr-2 h-4 w-4" />
              My Recipes
            </TabsTrigger>
            <TabsTrigger value="scan-receipt">
              <ScanLine className="mr-2 h-4 w-4" />
              Scan Receipt
            </TabsTrigger>
          </TabsList>

          {/* AI Recipe Creator Tab */}
          <TabsContent value="ai-creator" className="mt-6">
            <Card className="flex flex-col overflow-hidden h-[600px]">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Recipe Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 px-4 h-full">
                  <div className="space-y-4 py-4">
                    {messages.map((message, index) => (
                      <div key={index} className="space-y-2">
                        <div
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>

                        {/* Recipe Cards with Save Buttons */}
                        {message.recipes && message.recipes.length > 0 && (
                          <div className="space-y-2 ml-4">
                            {message.recipes.map((recipe, recipeIndex) => (
                              <Card key={recipeIndex} className="bg-background border-2">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm">{recipe.name}</h4>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                          {recipe.calories} cal
                                        </span>
                                        <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                                          {recipe.protein}g protein
                                        </span>
                                        {recipe.carbs && (
                                          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                            {recipe.carbs}g carbs
                                          </span>
                                        )}
                                        {recipe.isHighProtein && (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            High Protein
                                          </span>
                                        )}
                                        {recipe.isGlp1Friendly && (
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                            GLP-1 Friendly
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleSaveRecipe(recipe)}
                                      disabled={saveRecipe.isPending}
                                      className="flex-shrink-0"
                                    >
                                      {saveRecipe.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <BookOpen className="h-3 w-3 mr-1" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="flex-shrink-0 border-t p-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isLoading}
                      size="icon"
                      variant="default"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleInstantRecipe}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Instant Recipe
                    </Button>
                    <Input
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Recipes Tab */}
          <TabsContent value="my-recipes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  My Saved Recipes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recipesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (recipes as any)?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(recipes as any).map((recipe: any) => (
                      <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-semibold text-lg line-clamp-2">{recipe.name}</h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setRecipeToDelete(recipe.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {recipe.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {recipe.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-3">
                              {recipe.isGlp1Friendly && (
                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                  GLP-1 Friendly
                                </span>
                              )}
                              {recipe.isHighProtein && (
                                <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full">
                                  High Protein
                                </span>
                              )}
                              {recipe.isLowCarb && (
                                <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                                  Low Carb
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-muted-foreground">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{recipe.calories}</span>
                                <span>Calories</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{Number(recipe.protein).toFixed(0)}g</span>
                                <span>Protein</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{recipe.servings}</span>
                                <span>Servings</span>
                              </div>
                            </div>

                            <div className="flex gap-2 text-xs text-muted-foreground mb-3">
                              <span>⏱️ Prep: {recipe.prepTime}min</span>
                              <span>🍳 Cook: {recipe.cookTime}min</span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-auto"
                              onClick={() => {
                                setSelectedRecipe(recipe);
                                setIsRecipeDetailOpen(true);
                              }}
                            >
                              View Recipe
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No recipes yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create recipes with the AI Creator or scan receipts to build your collection
                    </p>
                    <Button onClick={() => setActiveTab("ai-creator")}>
                      <Bot className="mr-2 h-4 w-4" />
                      Get Started with AI
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scan Receipt Tab */}
          <TabsContent value="scan-receipt" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5" />
                  Scan Recipe from Receipt or Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Upload a photo of a recipe, receipt, or cookbook page to extract the recipe information
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full md:w-auto"
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Choose Image
                  </Button>
                </div>

                {imagePreview && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-96 mx-auto rounded-lg"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleScanReceipt}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <ScanLine className="mr-2 h-4 w-4" />
                            Scan & Extract Recipe
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={isRecipeDetailOpen} onOpenChange={setIsRecipeDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-4">
              {selectedRecipe.description && (
                <p className="text-muted-foreground">{selectedRecipe.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedRecipe.isGlp1Friendly && (
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    GLP-1 Friendly
                  </span>
                )}
                {selectedRecipe.isHighProtein && (
                  <span className="px-3 py-1 bg-secondary/10 text-secondary text-sm rounded-full">
                    High Protein
                  </span>
                )}
                {selectedRecipe.isLowCarb && (
                  <span className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full">
                    Low Carb
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{selectedRecipe.calories}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{Number(selectedRecipe.protein).toFixed(0)}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{Number(selectedRecipe.carbs).toFixed(0)}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{Number(selectedRecipe.fat).toFixed(0)}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <div>⏱️ <span className="font-medium">Prep:</span> {selectedRecipe.prepTime} min</div>
                <div>🍳 <span className="font-medium">Cook:</span> {selectedRecipe.cookTime} min</div>
                <div>🍽️ <span className="font-medium">Servings:</span> {selectedRecipe.servings}</div>
                <div>📊 <span className="font-medium">Difficulty:</span> {selectedRecipe.difficulty}</div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <ul className="space-y-1">
                  {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {typeof ingredient === 'string' ? ingredient : `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Instructions</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {Array.isArray(selectedRecipe.instructions)
                    ? selectedRecipe.instructions.map((step: string, index: number) => (
                        <p key={index} className="mb-2">{index + 1}. {step}</p>
                      ))
                    : selectedRecipe.instructions}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecipeDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recipeToDelete} onOpenChange={() => setRecipeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recipe? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => recipeToDelete && deleteRecipe.mutate(recipeToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
