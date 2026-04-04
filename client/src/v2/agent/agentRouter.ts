import type { Intent, Message, APIMessage, UserContext } from './types'

// 1. Keyword-based intent classifier — zero API cost
export function classifyIntent(text: string): Intent {
  const t = text.toLowerCase().trim()
  const has = (words: string[]) => words.some(w => t.includes(w))

  if (has(['scan barcode','qr code','scan a'])) return 'food.barcode'
  if (has(['scan receipt','my receipt','grocery list','grocery receipt'])) return 'recipe.receipt'
  if (has(['took my','log my dose','done my jab','done my injection','had my injection','had my jab','jabbed'])) return 'medication.quick_log'
  if (has(['nausea','feeling sick','side effect','vomiting','diarrhea','constipation','heartburn','feel rough','feeling rough','queasy','threw up'])) return 'medication.side_effect'
  if (has(['change dose','new dose','detailed log','different dose'])) return 'medication.detailed'
  if (has(['scan','barcode'])) return 'food.barcode'
  if (has(['i ate','i had','i\'ve had','just ate','just had','for breakfast','for lunch','for dinner','for tea','for supper','calories in','log meal','log food','ate a','had a','had some'])) return 'food.search'
  if (has(['still hungry','feel full','quite full','very full','not hungry','craving','satiety','fullness'])) return 'food.appetite'
  if (has(['my recipes','saved recipes','show me my recipes','my saved'])) return 'recipe.saved'
  if (has(['recipe','what should i cook','what should i eat','meal idea','suggest something','what can i make'])) return 'recipe.generate'
  if (has(['i weigh','my weight','on the scales','weighed myself','lost weight','gained weight'])) return 'weight.log'
  if (has([' kg',' lbs',' pounds',' stone','stone and'])) return 'weight.log'
  if (has(['weight trend','weight progress','how much have i lost','weight chart'])) return 'weight.progress'
  if (has(['how am i doing','my progress','this week','weekly summary','analytics','adherence','overview'])) return 'trends.general'
  return 'general'
}

// 2. Trim API context — never send full history to model
export function buildAPIContext(messages: Message[], maxUserTurns = 3): APIMessage[] {
  const result: APIMessage[] = []
  let count = 0
  for (let i = messages.length - 1; i >= 0 && count < maxUserTurns; i--) {
    const m = messages[i]
    if (m.isTemplated || m.component) continue
    result.unshift({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content })
    if (m.role === 'user') count++
  }
  return result
}

// 3. Contextual chips — zero API cost
export function getContextualChips(ctx: UserContext): string[] {
  if (ctx.medicationStatus === 'overdue') {
    return ['Log my dose now', 'I took it earlier', 'Remind me later', 'Log a meal']
  }
  if (ctx.medicationStatus === 'due-today') {
    return ['Log my dose', 'Not yet', 'Log a meal', 'How am I doing?']
  }
  const h = new Date().getHours()
  if (ctx.todayCalories === 0) return ['Log breakfast', 'Log my dose', 'Need a recipe', 'How am I doing?']
  if (h < 10) return ['Log breakfast', 'Log my dose', 'Need a recipe', 'How am I doing?']
  if (h < 14) return ['Log lunch', 'Log a snack', 'Need a recipe', 'How am I doing?']
  if (h < 19) return ['Log dinner', 'Log my weight', 'Need a recipe', 'How am I doing?']
  return ['Log evening snack', 'Log my weight', 'My progress today', 'How am I doing?']
}
