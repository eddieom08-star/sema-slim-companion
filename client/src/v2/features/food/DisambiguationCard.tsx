import { useState } from 'react'
import type { FoodResult } from './foodVariance'

interface DisambiguationCardProps {
  itemName: string
  options: FoodResult[]        // max 3
  onSelect: (food: FoodResult, qty: number) => void
}

const PORTION_CHIPS = ['×1', '×2', '×3', 'Custom']

export default function DisambiguationCard({ itemName, options, onSelect }: DisambiguationCardProps) {
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [customQty, setCustomQty] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const hasBigVariance = options.length > 1 &&
    Math.max(...options.map(o => Number(o.calories))) - Math.min(...options.map(o => Number(o.calories))) > 40

  if (selected) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full">
        <div className="bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600">
          How much {selected.name}?
        </div>
        <div className="flex gap-2 p-3 flex-wrap">
          {PORTION_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => {
                if (chip === 'Custom') { setShowCustom(true); return }
                const q = parseInt(chip.replace('×', ''))
                onSelect(selected, q)
              }}
              className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-700 font-medium active:bg-gray-200"
            >
              {chip}
            </button>
          ))}
        </div>
        {showCustom && (
          <div className="flex gap-2 px-3 pb-3">
            <input
              type="number" min="0.5" step="0.5"
              placeholder="e.g. 1.5"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              value={customQty}
              onChange={e => setCustomQty(e.target.value)}
            />
            <button
              onClick={() => { const q = parseFloat(customQty) || 1; onSelect(selected, q) }}
              className="bg-gray-900 text-white text-xs px-4 rounded-lg"
            >
              Log
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full">
      <div className="bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600">
        Which type of {itemName}?
      </div>
      {hasBigVariance && (
        <p className="px-4 pt-2 text-[10px] text-amber-600">Preparation method affects calories</p>
      )}
      {options.slice(0, 3).map((opt, i) => (
        <button
          key={opt.id ?? i}
          onClick={() => setSelected(opt)}
          className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-gray-50 active:bg-gray-100 text-left"
        >
          <div>
            <p className="text-sm font-medium text-gray-900 capitalize">{opt.name}</p>
            {opt.brand && (
              <p className="text-xs text-gray-400">{opt.brand}</p>
            )}
            <p className="text-xs text-gray-400">{opt.servingSize} {opt.servingUnit}</p>
          </div>
          <span className="text-sm font-bold text-blue-600 ml-4">{Math.round(Number(opt.calories))} cal</span>
        </button>
      ))}
    </div>
  )
}
