/** Tri-state selector for the violence-content tolerance (tame / violent / brutal). */

import { cn } from "@/lib/utils"
import type { ViolenceLevel } from "@/lib/types"

const LEVELS: { value: ViolenceLevel; label: string; short: string }[] = [
  { value: "tame", label: "Tame", short: "Tame" },
  { value: "violent", label: "Violent", short: "Viol" },
  { value: "brutal", label: "Brutal", short: "Brut" },
]

interface ViolenceLevelSelectorProps {
  violenceLevel: ViolenceLevel
  setViolenceLevel: (level: ViolenceLevel) => void
  className?: string
}

export function ViolenceLevelSelector({ violenceLevel, setViolenceLevel, className }: ViolenceLevelSelectorProps) {
  return (
    <div className={cn(
      "flex items-center rounded-full border border-white/10 overflow-hidden",
      className
    )}>
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => setViolenceLevel(level.value)}
          className={cn(
            "flex-1 px-2.5 py-1.5 text-xs font-medium text-center transition-all duration-200",
            violenceLevel === level.value
              ? level.value === "brutal"
                ? "bg-red-800/80 text-white"
                : level.value === "violent"
                ? "bg-orange-500/80 text-white"
                : "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          <span className="sm:hidden">{level.short}</span>
          <span className="hidden sm:inline">{level.label}</span>
        </button>
      ))}
    </div>
  )
}
