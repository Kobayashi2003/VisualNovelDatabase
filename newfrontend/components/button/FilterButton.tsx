import { cn } from "@/lib/utils"
import { Filter } from "lucide-react"

interface FilterButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function FilterButton({ onClick, disabled, className }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-2 rounded-full",
        "text-muted hover:text-white",
        "hover:bg-white/10",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Filters"
    >
      <Filter className="w-4 h-4" />
    </button>
  )
}
