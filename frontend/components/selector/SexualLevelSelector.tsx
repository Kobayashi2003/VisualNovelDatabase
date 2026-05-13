import { cn } from "@/lib/utils"

const LEVELS = [
  { value: "safe", label: "Safe", short: "Safe" },
  { value: "suggestive", label: "Suggestive", short: "Sugg" },
  { value: "explicit", label: "Explicit", short: "Expl" },
]

interface SexualLevelSelectorProps {
  sexualLevel: string
  setSexualLevel: (level: string) => void
  className?: string
}

export function SexualLevelSelector({ sexualLevel, setSexualLevel, className }: SexualLevelSelectorProps) {
  return (
    <div className={cn(
      "flex flex-row items-center rounded-full border border-white/10 overflow-hidden",
      className
    )}>
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => setSexualLevel(level.value)}
          className={cn(
            "flex-1 px-2.5 py-1.5 text-xs font-medium text-center transition-all duration-200",
            sexualLevel === level.value
              ? level.value === "explicit"
                ? "bg-red-500/80 text-white"
                : level.value === "suggestive"
                ? "bg-yellow-500/80 text-white"
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
