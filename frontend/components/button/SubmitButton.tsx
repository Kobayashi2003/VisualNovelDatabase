/** Search icon submit button used inside the header search bar. */

import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface SubmitButtonProps {
  handleSubmit: () => void
  disabled?: boolean
  className?: string
}

export function SubmitButton({ handleSubmit, disabled, className }: SubmitButtonProps) {
  return (
    <button
      onClick={handleSubmit}
      disabled={disabled}
      className={cn(
        "p-2 rounded-full",
        "text-muted hover:text-white",
        "hover:bg-white/10",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Search"
    >
      <Search className="w-4 h-4" />
    </button>
  )
}
