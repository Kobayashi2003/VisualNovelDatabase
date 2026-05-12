import { cn } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"

interface BackButtonProps {
  handleBack: () => void
  className?: string
}

export function BackButton({ handleBack, className }: BackButtonProps) {
  return (
    <button
      onClick={handleBack}
      className={cn(
        "p-2 rounded-full",
        "text-muted hover:text-white",
        "hover:bg-white/10",
        "transition-all duration-200",
        className
      )}
      aria-label="Go back"
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
  )
}
