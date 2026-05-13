import { cn } from "@/lib/utils"

const TYPE_OPTIONS = [
  { value: "v", label: "VN" },
  { value: "r", label: "Release" },
  { value: "c", label: "Char" },
  { value: "p", label: "Producer" },
  { value: "s", label: "Staff" },
  { value: "g", label: "Tag" },
  { value: "i", label: "Trait" },
]

interface TypeSelector1Props {
  selected: string
  onSelect: (type: string) => void
  disabled?: boolean
  className?: string
}

export function TypeSelector1({ selected, onSelect, disabled, className }: TypeSelector1Props) {
  return (
    <div className={cn(
      "flex flex-row items-center rounded-full border border-white/10 overflow-hidden",
      disabled && "opacity-40 cursor-not-allowed",
      className
    )}>
      {TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && onSelect(option.value)}
          className={cn(
            "px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
            selected === option.value
              ? "bg-accent text-white"
              : "text-muted hover:text-white hover:bg-white/10"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
