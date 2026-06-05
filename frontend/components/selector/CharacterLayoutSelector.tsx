/** Toggle for how the VN page renders characters — thumbnail grid or one-card slider. */

import { cn } from "@/lib/utils"
import type { VNCharacterLayout } from "@/lib/types"

const LAYOUTS: { value: VNCharacterLayout; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "slider", label: "Slides" },
]

interface CharacterLayoutSelectorProps {
  layout: VNCharacterLayout
  setLayout: (layout: VNCharacterLayout) => void
  className?: string
}

export function CharacterLayoutSelector({ layout, setLayout, className }: CharacterLayoutSelectorProps) {
  return (
    <div className={cn(
      "flex items-center rounded-full border border-white/10 overflow-hidden",
      className
    )}>
      {LAYOUTS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLayout(opt.value)}
          className={cn(
            "flex-1 px-2.5 py-1.5 text-xs font-medium text-center transition-all duration-200",
            layout === opt.value
              ? "bg-white/20 text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
