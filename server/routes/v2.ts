import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../clerkAuth';
import { storage } from '../storage';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router = Router();

// Build a short user context string for AI calls (~50 tokens)
async function getUserContext(userId: string): Promise<string> {
  try {
    const d = await storage.getDashboardData(userId);
    const parts: string[] = [];
    if (d.medicationType) parts.push(`On ${d.medicationType}${d.dosage ? ` ${d.dosage}` : ''}`);
    if (d.medicationStatus === 'overdue') parts.push('dose overdue');
    if (d.currentWeight) parts.push(`current weight ${d.currentWeight}kg`);
    if (d.targetWeight) parts.push(`target ${d.targetWeight}kg`);
    if (d.todayCalories > 0) parts.push(`${d.todayCalories} cal today`);
    if (d.avgHungerLevel !== null) parts.push(`hunger ${d.avgHungerLevel}/10`);
    return parts.length ? `User: ${parts.join(', ')}.` : '';
  } catch { return ''; }
}

const CLASSIFY_SYSTEM = `You are an intent classifier for a GLP-1 health app. Return JSON only, no markdown.
Format: {"intent":"string","entities":{"food_name":"string or null","weight_value":"number or null","weight_unit":"string or null","side_effect":"string or null","meal_type":"string or null"}}
Valid intents: food.search, food.barcode, food.appetite, medication.quick_log, medication.detailed, medication.side_effect, recipe.generate, recipe.saved, recipe.receipt, weight.log, weight.progress, trends.general, general`;

// POST /api/v2/classify — CORE-03
router.post('/v2/classify', requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.length > 500) {
      return res.json({ intent: 'general', entities: {} });
    }

    const ctx = await getUserContext(userId);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 120,
      system: [{ type: 'text', text: CLASSIFY_SYSTEM + (ctx ? `\n${ctx}` : ''), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: text.trim() }],
    });

    const raw = (response.content[0] as { type: 'text'; text: string }).text.trim();
    res.json(JSON.parse(raw));
  } catch {
    res.json({ intent: 'general', entities: {} });
  }
});

// POST /api/v2/extract-food-entity — FOOD-01
router.post('/v2/extract-food-entity', requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.json({ items: [], meal_type: null });
    }

    const SYSTEM = `Extract food items from natural language. Return JSON only, no markdown.
Format: {"items":[{"food_name":"string","quantity":"string or null"}],"meal_type":"breakfast|lunch|dinner|snack|tea|null"}
Rules:
- Split compound meals: "egg and bacon" → two items
- Preserve cooking method: "scrambled eggs" not just "eggs"
- quantity: natural language like "2", "a bowl of"
- meal_type: infer from time words or return null
- Maximum 5 items`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: text }],
    });

    const raw = (response.content[0] as { text: string }).text.trim();
    res.json(JSON.parse(raw));
  } catch {
    res.json({ items: [{ food_name: req.body.text, quantity: null }], meal_type: null });
  }
});

// POST /api/v2/appetite-insight — implemented in TRD-01
router.post('/v2/appetite-insight', requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stats, tab } = req.body;

    const SYSTEM = `You are a GLP-1 health coach. Given health statistics, write 2 concise sentences of insight.
Plain text only, no markdown, no lists. Be specific and actionable.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 120,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Health data for ${tab || 'general'} tab: ${JSON.stringify(stats)}` }],
    });

    res.json({ insight: (response.content[0] as { text: string }).text.trim() });
  } catch {
    res.json({ insight: 'Keep logging daily for better pattern insights.' });
  }
});

// POST /api/v2/scan-receipt — RECEIPT SCANNING
router.post('/v2/scan-receipt', requireAuth, async (req: any, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: [{ type: 'text', text: 'Extract food items from this receipt or menu photo. Return JSON only, no markdown: { "items": [{ "food_name": "string", "quantity": "string or null", "estimated_calories": number or null }] }', cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: 'Extract all food items from this image.' }
        ]
      }],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error: any) {
    console.error('Receipt scan error:', error);
    res.json({ items: [] });
  }
});

// POST /api/v2/recipe-from-image — Generate recipe from photo of ingredients/receipt
router.post('/v2/recipe-from-image', requireAuth, async (req: any, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Step 1: Extract ingredients from the image
    const extractRes = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: [{ type: 'text', text: 'Extract food ingredients from this image (receipt, grocery haul, fridge photo, or pantry). Return JSON only, no markdown: {"ingredients":["string"],"notes":"string or null"}', cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: 'List all food ingredients you can see.' }
        ]
      }],
    });

    let extractText = (extractRes.content[0] as { type: string; text: string }).text;
    extractText = extractText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const extracted = JSON.parse(extractText);
    if (!extracted.ingredients?.length) {
      return res.json({ error: 'no_ingredients', message: 'No ingredients found in the image.' });
    }

    // Step 2: Generate a GLP-1 friendly recipe from those ingredients
    const ctx = await getUserContext(userId);
    const RECIPE_SYSTEM = `You are a GLP-1 nutrition expert. Generate a single recipe using ONLY the provided ingredients (plus basic pantry staples like salt, pepper, oil).
Requirements: high protein (>25g), moderate calories (300-500), easy to eat in small portions, gentle on the stomach.${ctx ? `\n${ctx}` : ''}
Return JSON only, no markdown:
{"name":"string","prepTime":number,"cookTime":number,"servings":1,"ingredients":[{"name":"string","quantity":"string","unit":"string"}],"instructions":"string","calories":number,"protein":number,"carbs":number,"fat":number,"tags":["string"]}`;

    let recipeRes;
    try {
      recipeRes = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 800,
        system: [{ type: 'text', text: RECIPE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `Available ingredients: ${extracted.ingredients.join(', ')}` }],
      });
    } catch {
      recipeRes = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        system: [{ type: 'text', text: RECIPE_SYSTEM }],
        messages: [{ role: 'user', content: `Available ingredients: ${extracted.ingredients.join(', ')}` }],
      });
    }

    let recipeRaw = (recipeRes.content[0] as { type: string; text: string }).text;
    recipeRaw = recipeRaw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const recipe = JSON.parse(recipeRaw);

    // Persist to DB so user can save/favourite it
    const userId = req.auth?.userId;
    let savedRecipe = recipe;
    try {
      savedRecipe = await storage.createRecipe({
        userId,
        name: recipe.name,
        description: `Recipe from photo — ${extracted.ingredients.length} ingredients`,
        recipeType: 'dinner',
        difficulty: 'easy',
        prepTime: recipe.prepTime ?? 10,
        cookTime: recipe.cookTime ?? 20,
        servings: recipe.servings ?? 1,
        ingredients: recipe.ingredients ?? [],
        instructions: recipe.instructions ?? '',
        calories: recipe.calories ?? 0,
        protein: String(recipe.protein ?? 0),
        carbs: String(recipe.carbs ?? 0),
        fat: String(recipe.fat ?? 0),
        isGlp1Friendly: true,
        tags: recipe.tags ?? [],
      });
    } catch { /* non-critical — return without id */ }

    res.json({ recipe: { ...recipe, id: savedRecipe.id }, ingredients: extracted.ingredients });
  } catch (error: any) {
    console.error('Recipe from image error:', error);
    res.status(500).json({ error: 'Failed to generate recipe from image' });
  }
});

export default router;
