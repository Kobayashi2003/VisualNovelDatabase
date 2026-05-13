import { cn } from "@/lib/utils"
import { Settings2 } from "lucide-react"

interface Settings2ButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function Settings2Button({ onClick, disabled, className }: Settings2ButtonProps) {
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
      aria-label="Sort settings"
    >
      <Settings2 className="w-4 h-4" />
    </button>
  )
}
