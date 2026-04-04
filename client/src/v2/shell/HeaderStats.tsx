import { Pill, Activity, Utensils } from 'lucide-react'
import type { UserContext } from '@/v2/agent/types'

interface HeaderStatsProps {
  userContext: UserContext
  userInitials: string
  onMenuOpen: () => void
  onDoseTap: () => void
  onHungerTap: () => void
  onCalorieTap: () => void
}

export default function HeaderStats({
  userContext, userInitials, onMenuOpen,
  onDoseTap, onHungerTap, onCalorieTap,
}: HeaderStatsProps) {
  const doseColor = userContext.medicationStatus === 'overdue'
    ? 'text-red-200'
    : userContext.medicationStatus === 'on-track'
    ? 'text-green-200'
    : 'text-white'

  const hungerWord = !userContext.hungerLevel ? '—'
    : userContext.hungerLevel <= 3 ? 'very hungry'
    : userContext.hungerLevel <= 6 ? 'moderate'
    : 'satisfied'

  return (
    <div className="z-50 bg-gradient-to-r from-blue-500 to-purple-600 px-4 pb-4 flex-shrink-0 w-full max-w-full overflow-x-hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)' }}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onMenuOpen}
          className="w-9 h-9 rounded-full bg-white/20 flex flex-col items-center justify-center gap-[3.5px]"
        >
          <span className="w-4 h-[1.5px] bg-white rounded-full" />
          <span className="w-4 h-[1.5px] bg-white rounded-full" />
          <span className="w-4 h-[1.5px] bg-white rounded-full" />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-base">GLP Friend</p>
          <p className="text-white/65 text-[10px]">Health Assistant</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-semibold">
          {userInitials}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onDoseTap}
          className="bg-white/20 rounded-2xl p-3 text-left active:bg-white/30 transition-colors min-w-0"
        >
          <div className="flex items-center gap-1 mb-1">
            <Pill className="w-3 h-3 text-white/70" />
            <span className="text-white/70 text-[10px]">Dose</span>
          </div>
          <p className={`font-bold text-base truncate ${doseColor}`}>
            {userContext.medicationStatus === 'overdue' ? 'Overdue'
              : userContext.medicationStatus === 'on-track' ? 'On track'
              : userContext.medicationStatus === 'due-today' ? 'Due today'
              : '—'}
          </p>
          <p className="text-white/55 text-[10px] mt-0.5">{userContext.lastDoseLabel}</p>
        </button>

        <button
          onClick={onHungerTap}
          className="bg-white/20 rounded-2xl p-3 text-left active:bg-white/30 transition-colors min-w-0"
        >
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-white/70" />
            <span className="text-white/70 text-[10px]">Hunger</span>
          </div>
          <p className="text-white font-bold text-base truncate">
            {userContext.hungerLevel ? `${userContext.hungerLevel}/10` : '—'}
          </p>
          <p className="text-white/55 text-[10px] mt-0.5">{hungerWord}</p>
        </button>

        <button
          onClick={onCalorieTap}
          className="bg-white/20 rounded-2xl p-3 text-left active:bg-white/30 transition-colors min-w-0"
        >
          <div className="flex items-center gap-1 mb-1">
            <Utensils className="w-3 h-3 text-white/70" />
            <span className="text-white/70 text-[10px]">Today</span>
          </div>
          <p className="text-white font-bold text-base truncate">{userContext.todayCalories}</p>
          <p className="text-white/55 text-[10px] mt-0.5">calories</p>
        </button>
      </div>
    </div>
  )
}
