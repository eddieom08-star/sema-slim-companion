import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Heart, Clock, Users, ChefHat, Plus, Download, ExternalLink, Globe } from "lucide-react";
import type { Recipe } from "@shared/schema";

interface ExternalRecipe {
  externalId: string;
  name: string;
  description?: string;
  category?: string;
  area?: string;
  image?: string;
  tags?: string[];
  ingredients?: string[];
  instructions?: string | string[];
  youtube?: string;
  source?: string;
}

interface Category {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
}

export default function Recipes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedExternalRecipe, setSelectedExternalRecipe] = useState<ExternalRecipe | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/recipes/external/categories'],
    enabled: activeTab === "browse",
  });

  // Fetch recipes by category
  const { data: categoryRecipes = [], isLoading: loadingCategory } = useQuery<ExternalRecipe[]>({
    queryKey: ['/api/recipes/external/by-category', { category: selectedCategory }],
    enabled: activeTab === "browse" && !!selectedCategory && !searchQuery,
  });

  // Search external recipes
  const { data: externalSearchResults = [], isLoading: searchingExternal } = useQuery<ExternalRecipe[]>({
    queryKey: ['/api/recipes/external/search', { q: searchQuery }],
    enabled: activeTab === "browse" && searchQuery.length > 2,
  });

  // Fetch user recipes
  const { data: userRecipes = [], isLoading: loadingUser } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
    enabled: activeTab === "my-recipes",
  });

  // Fetch favorite recipes
  const { data: favoriteRecipes = [], isLoading: loadingFavorites } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes/favorites'],
    enabled: activeTab === "favorites",
  });

  // Import recipe mutation
  const importRecipeMutation = useMutation({
    mutationFn: async (externalId: string) => {
      return await apiRequest(`/api/recipes/import/${externalId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({ title: "Recipe saved to your collection!" });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      await apiRequest('/api/recipes/' + recipeId + '/favorite', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({ title: "Favorite updated" });
    },
  });

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/recipes', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      setCreateDialogOpen(false);
      toast({ title: "Recipe created successfully!" });
    },
  });

  const displayExternalRecipes = searchQuery.length > 2 
    ? externalSearchResults 
    : selectedCategory 
      ? categoryRecipes 
      : [];

  const isLoadingExternal = searchQuery.length > 2 ? searchingExternal : loadingCategory;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-recipes">Recipe Collection</h1>
            <p className="text-muted-foreground">Discover and save recipes for your journey</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-recipe">
                <Plus className="mr-2 h-4 w-4" />
                Create Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Recipe</DialogTitle>
                <DialogDescription>Add a new recipe to your collection</DialogDescription>
              </DialogHeader>
              <RecipeForm
                onSubmit={(data) => createRecipeMutation.mutate(data)}
                isPending={createRecipeMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="browse" data-testid="tab-browse-recipes">
              <Globe className="mr-2 h-4 w-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-recipes" data-testid="tab-my-recipes">My Recipes</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Heart className="mr-2 h-4 w-4" />
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* Browse External Recipes Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for recipes (e.g., 'chicken', 'pasta', 'dessert')..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 0) {
                    setSelectedCategory("");
                  }
                }}
                className="pl-10"
                data-testid="input-search-recipes"
              />
            </div>

            {/* Categories */}
            {!searchQuery && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Browse by Category</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {categories.slice(0, 12).map((category) => (
                    <Button
                      key={category.idCategory}
                      variant={selectedCategory === category.strCategory ? "default" : "outline"}
                      className="h-auto py-3 px-2 flex flex-col items-center gap-2"
                      onClick={() => setSelectedCategory(category.strCategory)}
                      data-testid={`category-${category.strCategory.toLowerCase()}`}
                    >
                      <img 
                        src={category.strCategoryThumb} 
                        alt={category.strCategory}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <span className="text-xs">{category.strCategory}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* External Recipe Grid */}
            {isLoadingExternal ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg"></div>
                    <CardHeader className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : displayExternalRecipes.length === 0 ? (
              <div className="text-center py-12" data-testid="no-recipes-message">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {searchQuery ? "No recipes found" : "Select a category to browse recipes"}
                </p>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "Choose from the categories above"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayExternalRecipes.map((recipe) => (
                  <ExternalRecipeCard
                    key={recipe.externalId}
                    recipe={recipe}
                    onView={() => setSelectedExternalRecipe(recipe)}
                    onImport={() => importRecipeMutation.mutate(recipe.externalId)}
                    isImporting={importRecipeMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Recipes Tab */}
          <TabsContent value="my-recipes" className="mt-6">
            {loadingUser ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : userRecipes.length === 0 ? (
              <div className="text-center py-12" data-testid="no-recipes-message">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No recipes yet</p>
                <p className="text-muted-foreground mb-4">Create your first recipe or import from the Browse tab</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Recipe
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onFavorite={() => toggleFavoriteMutation.mutate(recipe.id)}
                    onView={() => setSelectedRecipe(recipe)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="mt-6">
            {loadingFavorites ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : favoriteRecipes.length === 0 ? (
              <div className="text-center py-12" data-testid="no-recipes-message">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No favorites yet</p>
                <p className="text-muted-foreground">Save recipes to quickly access them later</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onFavorite={() => toggleFavoriteMutation.mutate(recipe.id)}
                    onView={() => setSelectedRecipe(recipe)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* User Recipe Detail Dialog */}
        {selectedRecipe && (
          <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <RecipeDetail recipe={selectedRecipe} />
            </DialogContent>
          </Dialog>
        )}

        {/* External Recipe Detail Dialog */}
        {selectedExternalRecipe && (
          <Dialog open={!!selectedExternalRecipe} onOpenChange={() => setSelectedExternalRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <ExternalRecipeDetail 
                recipe={selectedExternalRecipe} 
                onImport={() => {
                  importRecipeMutation.mutate(selectedExternalRecipe.externalId);
                  setSelectedExternalRecipe(null);
                }}
                isImporting={importRecipeMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function ExternalRecipeCard({ recipe, onView, onImport, isImporting }: { 
  recipe: ExternalRecipe; 
  onView: () => void; 
  onImport: () => void;
  isImporting: boolean;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-external-recipe-${recipe.externalId}`}>
      {recipe.image && (
        <div className="relative h-48 overflow-hidden cursor-pointer" onClick={onView}>
          <img 
            src={recipe.image} 
            alt={recipe.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
          {recipe.area && (
            <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur">
              {recipe.area}
            </Badge>
          )}
        </div>
      )}
      <CardHeader className="cursor-pointer" onClick={onView}>
        <CardTitle className="line-clamp-1" data-testid={`text-recipe-name-${recipe.externalId}`}>
          {recipe.name}
        </CardTitle>
        {recipe.category && (
          <CardDescription className="flex items-center gap-2">
            <ChefHat className="h-3 w-3" />
            {recipe.category}
          </CardDescription>
        )}
      </CardHeader>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={onImport}
          disabled={isImporting}
          data-testid={`button-import-${recipe.externalId}`}
        >
          <Download className="mr-2 h-4 w-4" />
          {isImporting ? "Saving..." : "Save to My Recipes"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function RecipeCard({ recipe, onFavorite, onView }: { recipe: Recipe; onFavorite: () => void; onView: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid={`card-recipe-${recipe.id}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1" onClick={onView}>
            <CardTitle className="line-clamp-1" data-testid={`text-recipe-name-${recipe.id}`}>{recipe.name}</CardTitle>
            <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            data-testid={`button-favorite-${recipe.id}`}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent onClick={onView} data-testid={`content-recipe-${recipe.id}`}>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {recipe.isGlp1Friendly && (
              <Badge variant="secondary" data-testid={`badge-glp1-${recipe.id}`}>GLP-1 Friendly</Badge>
            )}
            {recipe.isHighProtein && (
              <Badge variant="secondary">High Protein</Badge>
            )}
            {recipe.isLowCarb && (
              <Badge variant="secondary">Low Carb</Badge>
            )}
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{recipe.servings} servings</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="font-medium">{recipe.calories} cal</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </div>
            <div>
              <p className="font-medium">{recipe.protein}g</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExternalRecipeDetail({ recipe, onImport, isImporting }: { 
  recipe: ExternalRecipe; 
  onImport: () => void;
  isImporting: boolean;
}) {
  const instructions = typeof recipe.instructions === 'string' 
    ? recipe.instructions.split('\r\n').filter(s => s.trim()) 
    : recipe.instructions || [];

  return (
    <div className="space-y-6">
      {recipe.image && (
        <img 
          src={recipe.image} 
          alt={recipe.name}
          className="w-full h-64 object-cover rounded-lg"
        />
      )}
      
      <div>
        <h2 className="text-2xl font-bold mb-2">{recipe.name}</h2>
        <div className="flex gap-2 flex-wrap">
          {recipe.category && <Badge>{recipe.category}</Badge>}
          {recipe.area && <Badge variant="outline">{recipe.area}</Badge>}
          {recipe.tags?.map(tag => tag && (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onImport} disabled={isImporting}>
          <Download className="mr-2 h-4 w-4" />
          {isImporting ? "Saving..." : "Save to My Recipes"}
        </Button>
        {recipe.youtube && (
          <Button variant="outline" asChild>
            <a href={recipe.youtube} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Watch Video
            </a>
          </Button>
        )}
      </div>

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {instructions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Instructions</h3>
          <div className="prose prose-sm max-w-none">
            {instructions.map((instruction, index) => (
              <p key={index} className="mb-3">{instruction}</p>
            ))}
          </div>
        </div>
      )}

      {recipe.source && (
        <div className="pt-4 border-t">
          <a 
            href={recipe.source} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View Original Recipe
          </a>
        </div>
      )}
    </div>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{recipe.name}</h2>
        <p className="text-muted-foreground">{recipe.description}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {recipe.isGlp1Friendly && <Badge>GLP-1 Friendly</Badge>}
        {recipe.isHighProtein && <Badge>High Protein</Badge>}
        {recipe.isLowCarb && <Badge>Low Carb</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <Clock className="h-4 w-4 mx-auto mb-1" />
          <p className="text-sm font-medium">{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</p>
          <p className="text-xs text-muted-foreground">Total Time</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <Users className="h-4 w-4 mx-auto mb-1" />
          <p className="text-sm font-medium">{recipe.servings}</p>
          <p className="text-xs text-muted-foreground">Servings</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <ChefHat className="h-4 w-4 mx-auto mb-1" />
          <p className="text-sm font-medium capitalize">{recipe.difficulty || 'Medium'}</p>
          <p className="text-xs text-muted-foreground">Difficulty</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Nutritional Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-lg font-bold">{recipe.calories}</p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-lg font-bold">{recipe.protein}g</p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-lg font-bold">{recipe.carbs}g</p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-lg font-bold">{recipe.fat}g</p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
        <ul className="space-y-2">
          {(Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map((ingredient, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{ingredient}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Instructions</h3>
        <ol className="space-y-3">
          {(Array.isArray(recipe.instructions) ? recipe.instructions : []).map((instruction, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="flex-1 pt-0.5">{instruction}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function RecipeForm({ onSubmit, isPending }: { onSubmit: (data: any) => void; isPending: boolean }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    recipeType: "breakfast",
    difficulty: "medium",
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    ingredients: "",
    instructions: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    isGlp1Friendly: false,
    isHighProtein: false,
    isLowCarb: false,
    isPublic: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      protein: formData.protein.toString(),
      carbs: formData.carbs.toString(),
      fat: formData.fat.toString(),
      ingredients: formData.ingredients.split('\n').filter(i => i.trim()),
      instructions: formData.instructions.split('\n').filter(i => i.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Recipe Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          data-testid="input-recipe-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid="input-recipe-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipeType">Type</Label>
          <Select value={formData.recipeType} onValueChange={(value) => setFormData({ ...formData, recipeType: value })}>
            <SelectTrigger data-testid="select-recipe-type">
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

        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
            <SelectTrigger data-testid="select-difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prepTime">Prep Time (min)</Label>
          <Input
            id="prepTime"
            type="number"
            value={formData.prepTime}
            onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) })}
            data-testid="input-prep-time"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cookTime">Cook Time (min)</Label>
          <Input
            id="cookTime"
            type="number"
            value={formData.cookTime}
            onChange={(e) => setFormData({ ...formData, cookTime: parseInt(e.target.value) })}
            data-testid="input-cook-time"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            value={formData.servings}
            onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
            data-testid="input-servings"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ingredients">Ingredients (one per line)</Label>
        <Textarea
          id="ingredients"
          value={formData.ingredients}
          onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
          placeholder="1 cup flour&#10;2 eggs&#10;1/2 cup milk"
          rows={5}
          data-testid="input-ingredients"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions (one per line)</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder="Mix dry ingredients&#10;Beat eggs with milk&#10;Combine and cook"
          rows={5}
          data-testid="input-instructions"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="calories">Calories</Label>
          <Input
            id="calories"
            type="number"
            value={formData.calories}
            onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) })}
            data-testid="input-calories"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="protein">Protein (g)</Label>
          <Input
            id="protein"
            type="number"
            value={formData.protein}
            onChange={(e) => setFormData({ ...formData, protein: parseInt(e.target.value) })}
            data-testid="input-protein"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="carbs">Carbs (g)</Label>
          <Input
            id="carbs"
            type="number"
            value={formData.carbs}
            onChange={(e) => setFormData({ ...formData, carbs: parseInt(e.target.value) })}
            data-testid="input-carbs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fat">Fat (g)</Label>
          <Input
            id="fat"
            type="number"
            value={formData.fat}
            onChange={(e) => setFormData({ ...formData, fat: parseInt(e.target.value) })}
            data-testid="input-fat"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isGlp1Friendly"
            checked={formData.isGlp1Friendly}
            onCheckedChange={(checked) => setFormData({ ...formData, isGlp1Friendly: checked as boolean })}
            data-testid="checkbox-glp1-friendly"
          />
          <Label htmlFor="isGlp1Friendly" className="cursor-pointer">GLP-1 Friendly</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isHighProtein"
            checked={formData.isHighProtein}
            onCheckedChange={(checked) => setFormData({ ...formData, isHighProtein: checked as boolean })}
            data-testid="checkbox-high-protein"
          />
          <Label htmlFor="isHighProtein" className="cursor-pointer">High Protein</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isLowCarb"
            checked={formData.isLowCarb}
            onCheckedChange={(checked) => setFormData({ ...formData, isLowCarb: checked as boolean })}
            data-testid="checkbox-low-carb"
          />
          <Label htmlFor="isLowCarb" className="cursor-pointer">Low Carb</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublic"
            checked={formData.isPublic}
            onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked as boolean })}
            data-testid="checkbox-public"
          />
          <Label htmlFor="isPublic" className="cursor-pointer">Make Public</Label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-recipe">
        {isPending ? "Creating..." : "Create Recipe"}
      </Button>
    </form>
  );
}
