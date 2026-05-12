import { cn } from "@/lib/utils"

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
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-bold text-center",
        "bg-elevated border border-white/10",
        "text-white appearance-none",
        "focus:outline-none focus:border-white/30",
        "hover:border-white/20",
        "cursor-pointer",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-elevated text-sm">
          {opt.label}
        </option>
      ))}
    </select>
  )
}
