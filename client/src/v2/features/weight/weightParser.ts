export interface ParsedWeight { kg: number; display: string }

export function parseWeightFromText(text: string): ParsedWeight | null {
  const t = text.toLowerCase()

  // Stone and pounds: "12 stone 4" or "12st 4lbs"
  const stoneMatch = t.match(/(\d+)\s*(?:stone|st)(?:\s*(?:and)?\s*(\d+)\s*(?:lbs?|pounds?)?)?/)
  if (stoneMatch) {
    const stone = parseInt(stoneMatch[1])
    const lbs = stoneMatch[2] ? parseInt(stoneMatch[2]) : 0
    const kg = Math.round((stone * 14 + lbs) * 0.453592 * 10) / 10
    return { kg, display: `${stone}st ${lbs}lb` }
  }

  // Kilograms
  const kgMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kgs?)/)
  if (kgMatch) {
    return { kg: parseFloat(kgMatch[1]), display: `${kgMatch[1]}kg` }
  }

  // Pounds
  const lbsMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/)
  if (lbsMatch) {
    const kg = Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 10) / 10
    return { kg, display: `${lbsMatch[1]}lbs` }
  }

  return null
}
