import { cn } from "@/lib/utils"
import { useState } from "react"

interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  tooltip?: string
  tooltipPosition?: "top" | "bottom" | "left" | "right"
  className?: string
}

export function IconButton({ icon, onClick, disabled, tooltip, tooltipPosition = "top", className }: IconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "p-2 rounded-full",
          "text-muted hover:text-white",
          "hover:bg-white/10",
          "transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          className
        )}
      >
        {icon}
      </button>
      {tooltip && showTooltip && (
        <div className={cn(
          "absolute z-50 whitespace-nowrap",
          "px-2 py-1 text-xs rounded",
          "bg-elevated text-white border border-white/10",
          tooltipClasses[tooltipPosition]
        )}>
          {tooltip}
        </div>
      )}
    </div>
  )
}
