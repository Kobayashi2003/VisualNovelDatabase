import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const TYPE_OPTIONS = [
  { value: "v", label: "VN" },
  { value: "r", label: "Release" },
  { value: "c", label: "Character" },
  { value: "p", label: "Producer" },
  { value: "s", label: "Staff" },
  { value: "g", label: "Tag" },
  { value: "i", label: "Trait" },
]

interface TypeSelectProps {
  selected: string
  onSelect: (type: string) => void
  disabled?: boolean
  className?: string
}

export function TypeSelect({ selected, onSelect, disabled, className }: TypeSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className={cn(
          "appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold",
          "bg-elevated border border-white/10",
          "text-white",
          "focus:outline-none focus:border-white/30",
          "hover:border-white/20",
          "cursor-pointer",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-elevated text-sm">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
    </div>
  )
}
