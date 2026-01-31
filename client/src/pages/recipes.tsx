import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Navigation from "@/components/ui/navigation";
import { Bot, ScanLine, Send, Loader2, BookOpen, Trash2, ChefHat, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { resizeImageForClaude, type ProcessedImage } from "@/lib/image-utils";
import { ProUpsellModal } from "@/components/monetization/ProUpsellModal";
import { LimitReachedBanner } from "@/components/LimitReachedBanner";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Helper to parse error responses and extract user-friendly messages
function parseErrorResponse(error: any): { isLimitError: boolean; message: string; type?: string } {
  const errorMessage = error?.message || '';

  // Try to extract JSON from the error message (format: "403: {json}")
  const jsonMatch = errorMessage.match(/^\d+:\s*(\{.+\})$/s);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.error === 'limit_reached' || parsed.reason?.includes('limit')) {
        return {
          isLimitError: true,
          message: parsed.message || 'You have reached your usage limit.',
          type: parsed.reason || 'general'
        };
      }
      return {
        isLimitError: false,
        message: parsed.message || 'Something went wrong. Please try again.'
      };
    } catch (e) {
      // JSON parsing failed, fall through
    }
  }

  // Check for limit-related keywords
  if (errorMessage.includes('limit') || errorMessage.includes('403')) {
    return {
      isLimitError: true,
      message: 'You have reached your usage limit.',
      type: 'ai_recipe'
    };
  }

  return {
    isLimitError: false,
    message: errorMessage || 'Something went wrong. Please try again.'
  };
}

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
  fiber?: number;
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

// RecipeCard component for expandable recipe display
function RecipeCard({ recipe, onSave, isSaving }: {
  recipe: ParsedRecipe;
  onSave: () => void;
  isSaving: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-background border overflow-hidden w-full max-w-full">
      <CardContent className="p-3 overflow-hidden">
        {/* Header - always visible */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h4 className="font-semibold text-sm truncate">{recipe.name}</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                {recipe.calories} cal
              </span>
              <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full whitespace-nowrap">
                {recipe.protein}g protein
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              disabled={isSaving}
              className="h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-9 px-2"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* All macros */}
            <div className="flex flex-wrap gap-2">
              {recipe.carbs && (
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {recipe.carbs}g carbs
                </span>
              )}
              {recipe.fat && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {recipe.fat}g fat
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

            {/* Prep time */}
            <p className="text-xs text-muted-foreground">
              Prep: {recipe.prepTime} min | Servings: {recipe.servings}
            </p>

            {/* Ingredients */}
            {recipe.ingredients.length > 0 && recipe.ingredients[0] !== 'See recipe details above' && recipe.ingredients[0] !== 'See recipe details in message' && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium mb-1">Ingredients:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {recipe.ingredients.slice(0, 6).map((ing, i) => (
                    <li key={i} className="break-words">• {ing}</li>
                  ))}
                  {recipe.ingredients.length > 6 && (
                    <li className="text-primary">+ {recipe.ingredients.length - 6} more...</li>
                  )}
                </ul>
              </div>
            )}

            {/* Instructions */}
            {recipe.instructions.length > 0 && recipe.instructions[0] !== 'See preparation steps in message' && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium mb-1">Instructions:</p>
                <ol className="text-xs text-muted-foreground space-y-1">
                  {recipe.instructions.slice(0, 5).map((step, i) => (
                    <li key={i} className="break-words">{i + 1}. {step}</li>
                  ))}
                  {recipe.instructions.length > 5 && (
                    <li className="text-primary">+ {recipe.instructions.length - 5} more steps...</li>
                  )}
                </ol>
              </div>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to parse recipes from AI response
// Returns at most ONE recipe per AI response - treats the whole response as a single recipe
function parseRecipesFromText(text: string): ParsedRecipe[] {
  console.log('[Recipe Parse] Input text length:', text?.length, 'First 300 chars:', text?.substring(0, 300));

  // Check if text contains recipe-like content (nutritional info)
  // Support many formats: "330 calories", "Calories: 330", "- Calories: 330", "**Calories:** 330", etc.
  const caloriePatterns = [
    /(\d+)\s*(?:calories|cal|kcal)/i,
    /calories?[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*calories?[:\s*~-]+\s*(\d+)/i,  // Bullet point format: "- Calories: 360"
    /\*\*calories?\*\*[:\s*~-]+\s*(\d+)/i,
    /energy[:\s*~-]+\s*(\d+)/i,
  ];
  const proteinPatterns = [
    /(\d+)\s*g?\s*(?:of\s+)?protein/i,
    /protein[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*protein[:\s*~-]+\s*(\d+)/i,  // Bullet point format: "- Protein: 42g"
    /\*\*protein\*\*[:\s*~-]+\s*(\d+)/i,
  ];

  const hasCalories = caloriePatterns.some(p => p.test(text));
  const hasProtein = proteinPatterns.some(p => p.test(text));

  // Also check for recipe indicators even without exact nutrition
  const hasRecipeIndicators = /ingredients?|instructions?|directions?|steps?|prep\s*time|cook\s*time|servings?/i.test(text);

  // Check for recipe name patterns (bold title followed by recipe content)
  const hasRecipeTitle = /\*\*[A-Z][^*]+\*\*/i.test(text) || /^#+\s+[A-Z]/m.test(text);

  // Check for food-related terms that suggest a recipe
  const hasFoodTerms = /chicken|salmon|salad|steak|pasta|rice|quinoa|vegetables?|beef|pork|tofu|eggs?|oatmeal|smoothie|soup|stir.?fry/i.test(text);

  // Debug logging
  console.log('[Recipe Parse] hasCalories:', hasCalories, 'hasProtein:', hasProtein, 'hasRecipeIndicators:', hasRecipeIndicators, 'hasRecipeTitle:', hasRecipeTitle, 'hasFoodTerms:', hasFoodTerms);

  // If no nutritional info AND no recipe indicators AND no recipe title with food terms, not a recipe
  if (!hasCalories && !hasProtein && !hasRecipeIndicators && !(hasRecipeTitle && hasFoodTerms)) {
    return [];
  }

  // Extract nutrition from the ENTIRE text (single recipe)
  // Support many formats: "330 calories", "Calories: 330", "**Calories:** 330", etc.
  const extractNumber = (patterns: RegExp[]): number | null => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return parseInt(match[1]);
    }
    return null;
  };

  const calorieMatch = extractNumber([
    /(\d+)\s*(?:calories|cal|kcal)/i,
    /calories?[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*calories?[:\s*~-]+\s*(\d+)/i,  // "- Calories: 360"
    /\*\*calories?\*\*[:\s*~-]+\s*(\d+)/i,
  ]);
  const proteinMatch = extractNumber([
    /(\d+)\s*g?\s*(?:of\s+)?protein/i,
    /protein[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*protein[:\s*~-]+\s*(\d+)/i,  // "- Protein: 42g"
    /\*\*protein\*\*[:\s*~-]+\s*(\d+)/i,
  ]);
  const carbMatch = extractNumber([
    /(\d+)\s*g?\s*(?:of\s+)?carbs?/i,
    /carbs?[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*carbs?[:\s*~-]+\s*(\d+)/i,  // "- Carbs: 10g"
    /\*\*carbs?\*\*[:\s*~-]+\s*(\d+)/i,
    /carbohydrates?[:\s*~-]+\s*(\d+)/i,
  ]);
  const fatMatch = extractNumber([
    /(\d+)\s*g?\s*(?:of\s+)?fat/i,
    /fat[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*fat[:\s*~-]+\s*(\d+)/i,  // "- Fat: 16g"
    /\*\*fat\*\*[:\s*~-]+\s*(\d+)/i,
  ]);
  const fiberMatch = extractNumber([
    /(\d+)\s*g?\s*(?:of\s+)?fiber/i,
    /fiber[:\s*~-]+\s*(\d+)/i,
    /[-•*]\s*fiber[:\s*~-]+\s*(\d+)/i,  // "- Fiber: 5g"
    /\*\*fiber\*\*[:\s*~-]+\s*(\d+)/i,
  ]);
  const prepMatch = extractNumber([
    /prep[^:]*[:\s]+(\d+)/i,
    /(\d+)\s*(?:minutes?|min)\s*(?:prep|preparation)/i,
    /(\d+)\s*(?:minutes?|min)/i,
  ]);

  const calories = calorieMatch ?? 400;
  const protein = proteinMatch ?? 25;
  const carbs = carbMatch ?? undefined;
  const fat = fatMatch ?? undefined;
  const fiber = fiberMatch ?? undefined;
  const prepTime = prepMatch ?? 15;

  // Find recipe name - look for bold text, title-like line, or common patterns
  let recipeName = 'Recipe';

  // Try bold/header patterns first
  const boldMatch = text.match(/\*\*([^*]+)\*\*/);
  const headerMatch = text.match(/^###?\s*(.+)$/m);

  if (boldMatch) {
    recipeName = boldMatch[1].trim();
  } else if (headerMatch) {
    recipeName = headerMatch[1].trim();
  } else {
    // Look for a line that looks like a recipe name (capitalized, food-related words)
    const lines = text.split('\n').filter(l => l.trim());
    const foodWords = /chicken|salmon|salad|bowl|stir|grill|baked|roast|steam|vegetable|rice|quinoa|protein|healthy|low|high/i;
    const nameLine = lines.find(l =>
      l.length > 5 &&
      l.length < 80 &&
      !l.match(/^\d+[.)]/) && // Not a numbered step
      !l.match(/^[-•*]/) && // Not a bullet point
      !l.match(/calories|protein|carbs|fat|fiber/i) && // Not nutrition info
      (l.match(foodWords) || l.match(/^[A-Z]/)) // Has food word or starts with capital
    );
    if (nameLine) {
      recipeName = nameLine.replace(/[*#:]/g, '').trim();
    }
  }

  // Extract ingredients (lines with bullets or dashes)
  const ingredients = text.match(/^[\s]*[-•*]\s*(.+)$/gm)
    ?.map(line => line.replace(/^[\s]*[-•*]\s*/, '').trim())
    .filter(Boolean) || [];

  // Extract instructions (numbered steps) - handle various formats
  // Matches: "1. Step", "1) Step", "1: Step", with optional leading whitespace
  const instructions = text.match(/^[\s]*\d+[.):\s]+.+$/gm)
    ?.map(line => line.replace(/^[\s]*\d+[.):\s]+/, '').trim())
    .filter(line => line.length > 5) || [];

  const isHighProtein = protein >= 25;
  const isGlp1Friendly = protein >= 20 && (!fat || fat < 15);

  return [{
    name: recipeName,
    description: text.substring(0, 300).replace(/\n/g, ' ').trim(),
    calories,
    protein,
    carbs,
    fat,
    fiber,
    prepTime,
    cookTime: 0,
    servings: 1,
    difficulty: 'medium',
    ingredients: ingredients.length > 0 ? ingredients : ['See recipe details in message'],
    instructions: instructions.length > 0 ? instructions : ['See preparation steps in message'],
    isGlp1Friendly,
    isHighProtein,
    isLowCarb: carbs ? carbs < 30 : false
  }];
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
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isRecipeDetailOpen, setIsRecipeDetailOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [currentAIRecipe, setCurrentAIRecipe] = useState<any>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showLimitBanner, setShowLimitBanner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshSubscription } = useSubscription();

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

  const handleSendMessage = async (customMessage?: string, useInstantMode?: boolean) => {
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
      // Build system prompt based on mode
      const medicationType = (userProfile as any)?.medicationType;
      let enhancedPrompt: string;

      if (useInstantMode) {
        // Direct system prompt for instant recipes - no conversation, just generate
        enhancedPrompt = `You are a recipe generator. Generate ONE complete recipe immediately without asking ANY questions.

CRITICAL RULES:
- DO NOT ask clarifying questions
- DO NOT ask about preferences, dietary restrictions, or requirements
- DO NOT engage in conversation
- IMMEDIATELY provide a complete recipe

OUTPUT FORMAT (follow exactly):
**[Recipe Name]**

Ingredients:
- [ingredient 1]
- [ingredient 2]
...

Instructions:
1. [step 1]
2. [step 2]
...

Nutrition Info (per serving):
- Calories: [number]
- Protein: [number]g
- Carbs: [number]g
- Fat: [number]g

Prep Time: [number] minutes
Servings: [number]`;

        if (medicationType) {
          enhancedPrompt += `\n\nNote: User takes ${medicationType} (GLP-1). Prioritize high-protein (25g+), easy-to-digest meals.`;
        }
      } else {
        // Conversational mode
        enhancedPrompt = SYSTEM_PROMPT;
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
      }

      // Call Claude API through our backend (apiRequest handles auth headers)
      const response = await apiRequest('POST', '/api/ai/recipe-chat', {
        messages: useInstantMode ? [userMessage] : [...messages, userMessage],
        systemPrompt: enhancedPrompt
      });

      const data = await response.json();

      // Parse recipes from the AI response
      const parsedRecipes = parseRecipesFromText(data.message);

      // Debug: log parsing results
      console.log('[Recipe Debug] AI Response:', data.message?.substring(0, 200));
      console.log('[Recipe Debug] Parsed recipes:', parsedRecipes.length, parsedRecipes);

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        recipes: parsedRecipes.length > 0 ? parsedRecipes : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Recipe chat error:', error);

      // Parse the error to get a user-friendly message
      const parsedError = parseErrorResponse(error);

      if (parsedError.isLimitError) {
        // Show the inline limit banner instead of raw error
        setShowLimitBanner(true);
        // Refresh subscription to get updated usage counts
        refreshSubscription();
      } else {
        toast({
          title: "Unable to generate recipe",
          description: parsedError.message,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantRecipe = () => {
    const instantRecipePrompt = "Generate a quick, healthy recipe: under 400 calories, 25g+ protein, under 20 minutes prep time.";
    handleSendMessage(instantRecipePrompt, true); // true = instant mode
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      try {
        // For receipt/recipe scanning, we use more aggressive compression
        // 1024px max is sufficient for text extraction and reduces payload size
        let processed = await resizeImageForClaude(file, {
          maxDimension: 1024,  // Smaller size for faster uploads and API calls
          quality: 0.7,        // Lower quality is fine for text/receipt scanning
          format: 'jpeg'
        });

        // If the base64 is still very large (>2MB), compress more aggressively
        const base64SizeBytes = processed.base64.length * 0.75; // Approximate decoded size
        if (base64SizeBytes > 2 * 1024 * 1024) {
          processed = await resizeImageForClaude(file, {
            maxDimension: 800,
            quality: 0.5,
            format: 'jpeg'
          });
        }

        setProcessedImage(processed);
        setImagePreview(processed.base64WithPrefix);

        if (processed.wasResized) {
          toast({
            title: "Image optimized",
            description: `Resized to ${processed.width}x${processed.height} for best results.`,
          });
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // Fallback to original method if resize fails
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveRecipe = async (recipe: ParsedRecipe) => {
    try {
      // Convert arrays to proper format for database
      const ingredientsFormatted = recipe.ingredients.map(ing => ({
        name: ing,
        quantity: '',
        unit: ''
      }));

      // Instructions must be a string (not array) per schema
      const instructionsText = Array.isArray(recipe.instructions)
        ? recipe.instructions.join('\n')
        : recipe.instructions;

      const recipeData = {
        name: recipe.name,
        description: recipe.description,
        recipeType: 'dinner', // Default to dinner
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: ingredientsFormatted,
        instructions: instructionsText,
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
    if (!selectedImage || !processedImage) {
      toast({
        title: "No image selected",
        description: "Please upload a receipt image first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      toast({
        title: "Scanning...",
        description: "Extracting recipe information from image...",
      });

      // Send image to Claude for recipe extraction
      const response = await apiRequest('POST', '/api/ai/scan-recipe', {
        image: {
          base64: processedImage.base64,
          mediaType: processedImage.mediaType,
        }
      });

      const data = await response.json();

      if (data.recipe) {
        // Save the extracted recipe
        await saveRecipe.mutateAsync(data.recipe);

        toast({
          title: "Recipe extracted!",
          description: `"${data.recipe.name}" has been added to your collection.`,
        });
      } else if (data.message) {
        // Show the AI's response if no structured recipe was extracted
        toast({
          title: "Scan complete",
          description: data.message,
        });
      }

      setSelectedImage(null);
      setImagePreview(null);
      setProcessedImage(null);
    } catch (error: any) {
      console.error('Recipe scan error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to scan receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 overflow-x-hidden">
      <Navigation />
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Recipes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Create recipes with AI or scan existing ones</p>
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
          <TabsContent value="ai-creator" className="mt-4 overflow-hidden">
            <Card className="flex flex-col overflow-hidden h-[calc(100vh-260px)] min-h-[400px] max-h-[600px] w-full max-w-full">
              <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Bot className="h-5 w-5" />
                  AI Recipe Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4">
                  <div className="space-y-3 py-3" style={{ maxWidth: 'calc(100vw - 56px)' }}>
                    {messages.map((message, index) => (
                      <div key={index} className="space-y-2">
                        {/* Hide text bubble for assistant messages that have recipe cards */}
                        {!(message.role === "assistant" && message.recipes && message.recipes.length > 0) && (
                          <div
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg p-3 ${message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                                }`}
                              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </div>
                        )}

                        {/* Recipe Cards with Save Buttons - replaces text bubble for recipe responses */}
                        {message.recipes && message.recipes.length > 0 && (
                          <div className="space-y-2" style={{ maxWidth: 'calc(100vw - 56px)' }}>
                            {message.recipes.map((recipe, recipeIndex) => (
                              <RecipeCard
                                key={recipeIndex}
                                recipe={recipe}
                                onSave={() => handleSaveRecipe(recipe)}
                                isSaving={saveRecipe.isPending}
                              />
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
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 border-t p-3 space-y-2">
                  {/* Limit Reached Banner */}
                  {showLimitBanner && (
                    <LimitReachedBanner
                      type="ai_recipe"
                      onDismiss={() => setShowLimitBanner(false)}
                      onUpgrade={() => {
                        setShowLimitBanner(false);
                        setShowUpsellModal(true);
                      }}
                    />
                  )}
                  <Button
                    onClick={handleInstantRecipe}
                    disabled={isLoading || showLimitBanner}
                    className="w-full bg-primary text-white hover:bg-primary/90"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Instant Recipe
                  </Button>
                  <div className="flex gap-2">
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
                      disabled={isLoading || showLimitBanner}
                      className="flex-1"
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="on"
                      enterKeyHint="send"
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isLoading || showLimitBanner}
                      size="icon"
                      variant="default"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Recipes Tab */}
          <TabsContent value="my-recipes" className="mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <ChefHat className="h-5 w-5" />
                  My Saved Recipes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 md:p-5 md:pt-2">
                {recipesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (recipes as any)?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {(recipes as any).map((recipe: any) => (
                      <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 md:p-6">
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
                  <div className="text-center py-8">
                    <ChefHat className="h-14 w-14 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold text-foreground mb-1.5">No recipes yet</h3>
                    <p className="text-muted-foreground mb-3 text-sm">
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
          <TabsContent value="scan-receipt" className="mt-4">
            <Card>
              <CardHeader className="px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <ScanLine className="h-5 w-5" />
                  Scan Recipe from Receipt or Image
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 md:p-5 md:pt-2 space-y-4">
                <div className="text-center">
                  <p className="text-muted-foreground mb-3">
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

      {/* Pro Upsell Modal for Recipe Limit */}
      <ProUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        trigger={{ type: 'ai_limit' }}
      />
    </div>
  );
}
