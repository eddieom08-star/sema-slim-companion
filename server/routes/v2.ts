import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../clerkAuth';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router = Router();

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

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 120,
      system: [{ type: 'text', text: CLASSIFY_SYSTEM, cache_control: { type: 'ephemeral' } }],
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
      model: 'claude-3-haiku-20240307',
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
      model: 'claude-3-haiku-20240307',
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
      model: 'claude-3-haiku-20240307',
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

export default router;
